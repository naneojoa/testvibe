<#!
.SYNOPSIS
Starts the backend with secrets from the workspace .env.local file.

.DESCRIPTION
Loads only this application's supported environment variables into the current
PowerShell process, then starts Gradle. Secret values are never written to the console.
#>

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot '.env.local'
$gradleWrapper = Join-Path $PSScriptRoot 'gradlew.bat'

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw "Missing local environment file: $envFile"
}

$supportedNames = @(
    'DB_URL',
    'DB_USERNAME',
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_ACCESS_TOKEN_SECONDS',
    'JWT_REFRESH_TOKEN_SECONDS',
    'IP_HMAC_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD_HASH',
    'COOKIE_SECURE'
)

$values = @{}
foreach ($rawLine in Get-Content -LiteralPath $envFile) {
    $line = $rawLine.Trim()

    if (-not $line -or $line.StartsWith('#')) {
        continue
    }

    $pair = $line -split '=', 2
    if ($pair.Count -ne 2) {
        throw "Invalid .env.local entry for a local backend launch."
    }

    $name = $pair[0].Trim()
    $value = $pair[1]
    # VS Code's envFile support removes dotenv quote delimiters. Do the same so
    # quoted Base64 secrets and BCrypt hashes are passed to Spring unchanged.
    if (
        $value.Length -ge 2 -and
        (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    if ($supportedNames -notcontains $name) {
        throw "Unsupported .env.local variable for the backend launcher: $name"
    }

    $values[$name] = $value
}

$requiredNames = @('DB_PASSWORD', 'JWT_SECRET', 'IP_HMAC_SECRET')
foreach ($name in $requiredNames) {
    if ([string]::IsNullOrWhiteSpace($values[$name])) {
        throw "Required .env.local variable is missing or empty: $name"
    }
}

foreach ($name in $values.Keys) {
    Set-Item -Path "Env:$name" -Value $values[$name]
}

Write-Host 'Starting backend with .env.local environment variables.'
& $gradleWrapper bootRun '--args=--spring.profiles.active=local --debug=false --logging.level.root=INFO'
exit $LASTEXITCODE
