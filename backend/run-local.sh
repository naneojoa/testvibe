c


#!/usr/bin/env sh

# Starts the backend with secrets from the workspace .env.local file.
# Only this application's supported variables are loaded, and secret values
# are never written to the console.

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
workspace_root=$(dirname -- "$script_dir")
env_file="$workspace_root/.env.local"
gradle_wrapper="$script_dir/gradlew"

if [ ! -f "$env_file" ]; then
    printf '%s\n' "Missing local environment file: $env_file" >&2
    exit 1
fi

has_db_password=false
has_jwt_secret=false
has_ip_hmac_secret=false

while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    line=$(printf '%s' "$raw_line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    case "$line" in
        ''|'#'*) continue ;;
    esac

    case "$line" in
        *=*) ;;
        *)
            printf '%s\n' 'Invalid .env.local entry for a local backend launch.' >&2
            exit 1
            ;;
    esac

    name=${line%%=*}
    value=${line#*=}
    name=$(printf '%s' "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    if [ "${#value}" -ge 2 ]; then
        case "$value" in
            \"*\") value=${value#\"}; value=${value%\"} ;;
            \'*\') value=${value#\'}; value=${value%\'} ;;
        esac
    fi

    case "$name" in
        DB_URL) DB_URL=$value; export DB_URL ;;
        DB_USERNAME) DB_USERNAME=$value; export DB_USERNAME ;;
        DB_PASSWORD)
            DB_PASSWORD=$value
            export DB_PASSWORD
            has_db_password=true
            ;;
        JWT_SECRET)
            JWT_SECRET=$value
            export JWT_SECRET
            has_jwt_secret=true
            ;;
        JWT_ACCESS_TOKEN_SECONDS)
            JWT_ACCESS_TOKEN_SECONDS=$value
            export JWT_ACCESS_TOKEN_SECONDS
            ;;
        JWT_REFRESH_TOKEN_SECONDS)
            JWT_REFRESH_TOKEN_SECONDS=$value
            export JWT_REFRESH_TOKEN_SECONDS
            ;;
        IP_HMAC_SECRET)
            IP_HMAC_SECRET=$value
            export IP_HMAC_SECRET
            has_ip_hmac_secret=true
            ;;
        ADMIN_EMAIL) ADMIN_EMAIL=$value; export ADMIN_EMAIL ;;
        ADMIN_PASSWORD_HASH)
            ADMIN_PASSWORD_HASH=$value
            export ADMIN_PASSWORD_HASH
            ;;
        COOKIE_SECURE) COOKIE_SECURE=$value; export COOKIE_SECURE ;;
        *)
            printf '%s\n' "Unsupported .env.local variable for the backend launcher: $name" >&2
            exit 1
            ;;
    esac
done < "$env_file"

if [ "$has_db_password" != true ] || [ -z "$(printf '%s' "$DB_PASSWORD" | sed 's/[[:space:]]//g')" ]; then
    printf '%s\n' 'Required .env.local variable is missing or empty: DB_PASSWORD' >&2
    exit 1
fi

if [ "$has_jwt_secret" != true ] || [ -z "$(printf '%s' "$JWT_SECRET" | sed 's/[[:space:]]//g')" ]; then
    printf '%s\n' 'Required .env.local variable is missing or empty: JWT_SECRET' >&2
    exit 1
fi

if [ "$has_ip_hmac_secret" != true ] || [ -z "$(printf '%s' "$IP_HMAC_SECRET" | sed 's/[[:space:]]//g')" ]; then
    printf '%s\n' 'Required .env.local variable is missing or empty: IP_HMAC_SECRET' >&2
    exit 1
fi

printf '%s\n' 'Starting backend with .env.local environment variables.'
exec sh "$gradle_wrapper" bootRun \
    '--args=--spring.profiles.active=local --debug=false --logging.level.root=INFO'
