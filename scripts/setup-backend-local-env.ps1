[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$workspaceDirectory = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $workspaceDirectory '.env.local'

if ((Test-Path -LiteralPath $environmentFile) -and -not $Force) {
    Write-Host '.env.local already exists. Use -Force to replace it.'
    exit 0
}

function Read-RequiredText {
    param([string]$Prompt)

    do {
        $value = Read-Host $Prompt
    } while ([string]::IsNullOrWhiteSpace($value))

    return $value
}

function Read-RequiredSecret {
    param([string]$Prompt)

    $secureValue = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)

    try {
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ([string]::IsNullOrWhiteSpace($value)) {
            throw "$Prompt is required."
        }
        return $value
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function New-RandomBase64Secret {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()

    try {
        $generator.GetBytes($bytes)
        return [Convert]::ToBase64String($bytes)
    }
    finally {
        $generator.Dispose()
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

function ConvertTo-EnvironmentValue {
    param([string]$Value)

    if ($Value.Contains("`r") -or $Value.Contains("`n")) {
        throw 'Environment values must not contain line breaks.'
    }

    return ConvertTo-Json $Value -Compress
}

$databasePassword = Read-RequiredSecret 'DB password'
$adminEmail = Read-RequiredText 'ADMIN email'
$adminPasswordHash = Read-RequiredSecret 'ADMIN BCrypt hash'

if ($adminPasswordHash -notmatch '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$') {
    throw 'ADMIN BCrypt hash is not a valid 60-character BCrypt hash.'
}

$jwtSecret = New-RandomBase64Secret
$ipHmacSecret = New-RandomBase64Secret

$lines = @(
    'DB_URL=' + (ConvertTo-EnvironmentValue 'jdbc:postgresql://localhost:5432/community')
    'DB_USERNAME=' + (ConvertTo-EnvironmentValue 'community_app')
    'DB_PASSWORD=' + (ConvertTo-EnvironmentValue $databasePassword)
    'JWT_SECRET=' + (ConvertTo-EnvironmentValue $jwtSecret)
    'IP_HMAC_SECRET=' + (ConvertTo-EnvironmentValue $ipHmacSecret)
    'ADMIN_EMAIL=' + (ConvertTo-EnvironmentValue $adminEmail)
    'ADMIN_PASSWORD_HASH=' + (ConvertTo-EnvironmentValue $adminPasswordHash)
    'COOKIE_SECURE=' + (ConvertTo-EnvironmentValue 'false')
)

[IO.File]::WriteAllLines($environmentFile, $lines, [Text.UTF8Encoding]::new($false))

$databasePassword = $null
$adminPasswordHash = $null
$jwtSecret = $null
$ipHmacSecret = $null

Write-Host "Created $environmentFile"
Write-Host 'In Spring Boot Dashboard, use Run or Debug on BoardApplication.'
Write-Warning '.env.local contains local secrets in plain text. It is excluded by .gitignore.'
