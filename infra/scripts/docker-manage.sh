#!/bin/bash
# docker-manage.sh - Docker + mobile: dev/prod/deploy and Android/iOS testing (run from repo root or infra/scripts)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Repo root: infra/scripts -> .. = infra, ../.. = repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/infra/docker-compose.yml"

SERVICES=("nginx" "frontend" "backend" "db" "migrations")
CONTAINER_NAMES=("campus-circle-frontend" "campus-circle-frontend-dev" "campus-circle-backend" "campus-circle-db" "campus-circle-migrations")

# API URL for mobile: Android emulator sees host as 10.0.2.2; physical devices on same WiFi need host's LAN IP
ANDROID_EMULATOR_API="http://10.0.2.2:8000/api"
IOS_SIMULATOR_API="http://localhost:8000/api"

# Get host LAN IP for same-WiFi testing (Android/iPad physical devices)
get_lan_api_url() {
    [ -n "$REACT_APP_API_URL" ] && echo "$REACT_APP_API_URL" && return
    local ip
    if [[ "$(uname)" == "Darwin" ]]; then
        ip=$(ipconfig getifaddr en0 2>/dev/null) || ip=$(ipconfig getifaddr en1 2>/dev/null) || ip=$(ipconfig getifaddr bridge0 2>/dev/null)
    else
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    [ -n "$ip" ] && echo "http://${ip}:8000/api" || echo ""
}

usage() {
    echo -e "${BLUE}Campus Circle – docker-manage.sh${NC}"
    echo "Usage: $0 [COMMAND] [SERVICE|CONTAINER_NAME]"
    echo "  start [svc]        Start services (default: backend only). Pass 'db' for local DB (profile local-db)."
    echo "  stop [svc]         Stop services. No arg = stop all."
    echo "  restart [svc]      Restart a service."
    echo "  build [svc]        Build images. No arg: also sync mobile app for simulators."
    echo "  logs [svc]         Show logs."
    echo "  status             Service status."
    echo "  clean              Stop and remove containers/volumes."
    echo "  shell [svc]        Shell in container."
    echo "  validate           Validate docker-compose."
    echo "  migrate            Run database migrations."
    echo "  run                Stop all, then start dev (backend + frontend). http://localhost:3000"
    echo "  dev                Build + recreate backend + frontend dev. http://localhost:3000 | Backend :8000"
    echo "  prod               Start backend + nginx (needs frontend/build). http://localhost"
    echo "  deploy             Stop all, build frontend + backend, start prod stack."
    echo "  android            Build web, sync Capacitor, open Android Studio. Set REACT_APP_API_URL for device."
    echo "  apk                Build debug APK for same-WiFi testing (auto-detects LAN IP). Output: frontend/android/app/build/outputs/apk/debug/"
    echo "  ios                Build web, sync Capacitor, open Xcode. Set REACT_APP_API_URL for device."
    echo "Services: ${SERVICES[*]}"
    echo "Examples: $0 dev | $0 apk | $0 android | REACT_APP_API_URL=http://192.168.1.10:8000/api $0 apk"
    exit 1
}

check_env() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${YELLOW}⚠ .env not found. Copying from .env.example${NC}"
        [ -f "$PROJECT_ROOT/.env.example" ] && cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env" || exit 1
    fi
}

# Ensure npm is on PATH (e.g. when Node is from nvm/fnm and script runs in non-interactive bash)
ensure_npm() {
    if command -v npm >/dev/null 2>&1; then return; fi
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        # shellcheck source=/dev/null
        . "$HOME/.nvm/nvm.sh"
    elif [ -f "$HOME/.fnm/fnm" ] || command -v fnm >/dev/null 2>&1; then
        eval "$(fnm env 2>/dev/null)" || true
    fi
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}npm not found. Install Node.js (https://nodejs.org) or run this from a terminal where 'npm' works (e.g. after nvm use).${NC}"
        exit 1
    fi
}

validate_service() {
    local s=$1
    [[ " ${SERVICES[*]} " =~ " $s " ]] || { echo -e "${RED}Invalid service: $s${NC}"; exit 1; }
}

# Resolve second arg to compose service name (container name -> service name)
resolve_service() {
    local arg="$1"
    [ -z "$arg" ] && return
    case "$arg" in
        campus-circle-frontend)    echo nginx ;;
        campus-circle-frontend-dev) echo frontend ;;
        campus-circle-backend)     echo backend ;;
        campus-circle-db)          echo db ;;
        campus-circle-migrations)  echo migrations ;;
        *)                         echo "$arg" ;;
    esac
}

run_compose() {
    local cmd=$1
    local svc=$2
    cd "$PROJECT_ROOT"
    local env_file="$PROJECT_ROOT/.env"
    if [ -z "$svc" ]; then
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$env_file" -f "$COMPOSE_FILE" $cmd
    else
        validate_service "$svc"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$env_file" -f "$COMPOSE_FILE" $cmd "$svc"
    fi
}

case "${1:-}" in
    start)
        check_env
        if [ -z "$2" ]; then
            run_compose "up -d backend"
            echo -e "${GREEN}✅ Backend started (DB = Supabase from .env). http://localhost:8000${NC}"
            echo -e "${YELLOW}Tip: $0 dev (dev server) | $0 prod (frontend) | $0 start db (local DB only)${NC}"
        else
            svc=$(resolve_service "$2")
            validate_service "$svc"
            if [ "$svc" = "db" ]; then
                cd "$PROJECT_ROOT" && docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile local-db up -d db
                echo -e "${GREEN}✅ Local Postgres started. Set SUPABASE_DB_HOST=db in .env to use it.${NC}"
            else
                run_compose "up -d" "$svc"
            fi
        fi
        ;;
    run)
        check_env
        echo -e "${BLUE}Stopping any existing containers...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev --profile nginx --profile migrations --profile local-db down 2>/dev/null || true
        echo -e "${BLUE}Starting dev stack (backend + frontend)...${NC}"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev up -d --build --force-recreate backend frontend
        echo -e "${GREEN}✅ App running. http://localhost:3000 | Backend http://localhost:8000${NC}"
        echo -e "${YELLOW}First time? Run migrations: $0 migrate${NC}"
        ;;
    dev)
        check_env
        cd "$PROJECT_ROOT"
        echo -e "${BLUE}Building and starting dev stack (backend + frontend)...${NC}"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev up -d --build --force-recreate backend frontend
        echo -e "${GREEN}✅ Dev: Frontend http://localhost:3000 | Backend http://localhost:8000 (DB = Supabase)${NC}"
        ;;
    prod)
        check_env
        if [ ! -d "$PROJECT_ROOT/frontend/build" ]; then
            echo -e "${YELLOW}⚠ frontend/build not found. Run: REACT_APP_API_URL=http://localhost/api $0 deploy${NC}"
            exit 1
        fi
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile nginx up -d backend nginx
        echo -e "${GREEN}✅ Prod: http://localhost | Backend: http://localhost:8000 (DB = Supabase)${NC}"
        ;;
    deploy)
        check_env
        echo -e "${BLUE}Stopping all project containers...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev --profile nginx --profile migrations --profile local-db down 2>/dev/null || true
        export REACT_APP_API_URL="${REACT_APP_API_URL:-http://localhost/api}"
        echo -e "${BLUE}Building frontend (REACT_APP_API_URL=$REACT_APP_API_URL)...${NC}"
        cd "$PROJECT_ROOT/frontend" && npm ci && npm run build && cd "$PROJECT_ROOT"
        echo -e "${BLUE}Building backend...${NC}"
        run_compose "build" "backend"
        echo -e "${BLUE}Starting backend + frontend (prod; nginx serves static build; DB = Supabase)...${NC}"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile nginx up -d backend nginx
        echo -e "${GREEN}✅ Deployed. App: http://localhost | Backend: http://localhost:8000${NC}"
        echo -e "${YELLOW}If DB has no schema: ./infra/scripts/run.sh db migrate${NC}"
        echo -e "${YELLOW}Optional demo users + super admin: ./infra/scripts/run.sh db setup${NC}"
        ;;
    migrate)
        check_env
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile migrations up migrations
        echo -e "${GREEN}✅ Migrations completed${NC}"
        ;;
    stop)
        cd "$PROJECT_ROOT"
        if [ -n "$2" ]; then
            svc=$(resolve_service "$2")
            validate_service "$svc"
            docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" stop "$svc"
        else
            docker-compose --project-name campus-circle --project-directory "$PROJECT_ROOT" --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev --profile nginx --profile migrations --profile local-db down
            echo -e "${GREEN}✅ All containers stopped${NC}"
        fi
        ;;
    restart)
        [ -z "$2" ] && { echo -e "${RED}Pass a service or container name to restart (e.g. $0 restart backend)${NC}"; exit 1; }
        svc=$(resolve_service "$2")
        validate_service "$svc"
        run_compose "restart" "$svc"
        ;;
    build)
        check_env
        if [ -n "$2" ]; then
            svc=$(resolve_service "$2")
            validate_service "$svc"
            run_compose "build --no-cache" "$svc"
        else
            run_compose "build --no-cache"
            # Refresh mobile app (Android + iOS) so simulators get latest on next open
            if ! command -v npm >/dev/null 2>&1 && [ -f "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
            if command -v npm >/dev/null 2>&1; then
                api_url="${REACT_APP_API_URL:-$ANDROID_DEFAULT_API}"
                echo -e "${BLUE}Syncing mobile app (API: $api_url)...${NC}"
                (cd "$PROJECT_ROOT/frontend" && REACT_APP_API_URL="$api_url" npm run cap:sync) && echo -e "${GREEN}✅ Mobile app synced. Open with: $0 android | $0 ios${NC}" || echo -e "${YELLOW}⚠ Mobile sync skipped (npm not found or cap:sync failed)${NC}"
            fi
        fi
        ;;
    logs)
        if [ -n "$2" ]; then
            svc=$(resolve_service "$2")
            validate_service "$svc"
            run_compose "logs -f" "$svc"
        else
            run_compose "logs -f"
        fi
        ;;
    status) run_compose "ps"; docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null) 2>/dev/null || true; ;;
    clean)
        read -p "Remove all containers and volumes? (y/N) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] && run_compose "down -v" && echo -e "${GREEN}✅ Cleaned${NC}" || echo "Cancelled."
        ;;
    shell)
        [ -z "$2" ] && { echo "Usage: $0 shell <service|container_name>"; exit 1; }
        svc=$(resolve_service "$2")
        validate_service "$svc"
        cid=$(docker-compose --project-name campus-circle -f "$COMPOSE_FILE" ps -q "$svc")
        [ -z "$cid" ] && { echo "Container not running"; exit 1; }
        docker exec -it "$cid" /bin/sh || docker exec -it "$cid" /bin/bash
        ;;
    validate) docker-compose -f "$COMPOSE_FILE" config >/dev/null && echo -e "${GREEN}✅ Valid${NC}" || { docker-compose -f "$COMPOSE_FILE" config; exit 1; }; ;;
    android)
        check_env
        ensure_npm
        api_url="${REACT_APP_API_URL:-$ANDROID_EMULATOR_API}"
        echo -e "${BLUE}Building frontend and syncing to Android (API: $api_url)...${NC}"
        cd "$PROJECT_ROOT/frontend" || exit 1
        REACT_APP_API_URL="$api_url" npm run cap:sync || { echo -e "${RED}cap:sync failed. Run: cd frontend && npm ci${NC}"; exit 1; }
        echo -e "${GREEN}Opening Android Studio...${NC}"
        npm run cap:android
        ;;
    apk)
        check_env
        ensure_npm
        lan_url=$(get_lan_api_url)
        api_url="${REACT_APP_API_URL:-$lan_url}"
        if [ -z "$api_url" ]; then
            echo -e "${YELLOW}Could not detect LAN IP. Set REACT_APP_API_URL=http://YOUR_IP:8000/api for same-WiFi device testing.${NC}"
            api_url="http://10.0.2.2:8000/api"
        fi
        echo -e "${BLUE}Building APK for same-WiFi testing (API: $api_url)...${NC}"
        cd "$PROJECT_ROOT/frontend" || exit 1
        REACT_APP_API_URL="$api_url" npm run cap:sync || { echo -e "${RED}cap:sync failed${NC}"; exit 1; }
        cd android || exit 1
        ./gradlew assembleDebug 2>/dev/null || ./gradlew.bat assembleDebug 2>/dev/null || { echo -e "${RED}Gradle build failed. Run from Android Studio: $0 android${NC}"; exit 1; }
        apk_path="$PROJECT_ROOT/frontend/android/app/build/outputs/apk/debug/app-debug.apk"
        echo -e "${GREEN}✅ APK built: $apk_path${NC}"
        echo -e "${YELLOW}Install on Android: adb install -r $apk_path${NC}"
        echo -e "${YELLOW}Ensure backend is running (Docker: $0 run) and device is on same WiFi as this machine.${NC}"
        ;;
    ios)
        check_env
        ensure_npm
        api_url="${REACT_APP_API_URL:-$IOS_SIMULATOR_API}"
        echo -e "${BLUE}Building frontend and syncing to iOS (API: $api_url)...${NC}"
        cd "$PROJECT_ROOT/frontend" || exit 1
        REACT_APP_API_URL="$api_url" npm run cap:sync || { echo -e "${RED}cap:sync failed. Run: cd frontend && npm ci${NC}"; exit 1; }
        echo -e "${GREEN}Opening Xcode...${NC}"
        npm run cap:ios
        ;;
    *) usage; ;;
esac
