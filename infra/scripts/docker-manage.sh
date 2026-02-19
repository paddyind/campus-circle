#!/bin/bash
# docker-manage.sh - Manage Campus Circle Docker containers (run from repo root or infra/scripts)

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

usage() {
    echo -e "${BLUE}Campus Circle Docker Management${NC}"
    echo "Usage: $0 [COMMAND] [SERVICE|CONTAINER_NAME]"
    echo "  start [svc]        Start services (default: backend only; DB = Supabase from .env). Pass 'db' + profile local-db for local DB."
    echo "  stop [svc]         Stop services. No arg = stop all."
    echo "  restart [svc]      Restart a service (pass name)."
    echo "  build [svc]        Build images."
    echo "  logs [svc]         Show logs."
    echo "  status             Service status"
    echo "  clean              Stop and remove containers/volumes"
    echo "  shell [svc]        Shell in container (service or container name)."
    echo "  validate           Validate docker-compose"
    echo "  migrate            Run database migrations (Docker)"
    echo "  run                For demo/MVP: stop all, then start dev (backend + frontend). DB = Supabase. http://localhost:3000"
    echo "  dev                Start backend + frontend dev server. DB from .env (Supabase). http://localhost:3000"
    echo "  prod               Start backend + frontend (nginx). DB from .env (Supabase)."
    echo "  deploy             Stop all, build frontend + backend, start prod stack (for later use)"
    echo "Services: ${SERVICES[*]}"
    echo "Container names: ${CONTAINER_NAMES[*]}"
    echo "Examples: $0 run (demo) | $0 dev | $0 stop | $0 start campus-circle-frontend"
    exit 1
}

check_env() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${YELLOW}⚠ .env not found. Copying from .env.example${NC}"
        [ -f "$PROJECT_ROOT/.env.example" ] && cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env" || exit 1
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
        docker-compose --project-name campus-circle --env-file "$env_file" -f "$COMPOSE_FILE" $cmd
    else
        validate_service "$svc"
        docker-compose --project-name campus-circle --env-file "$env_file" -f "$COMPOSE_FILE" $cmd "$svc"
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
                cd "$PROJECT_ROOT" && docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile local-db up -d db
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
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev --profile nginx --profile migrations --profile local-db down 2>/dev/null || true
        echo -e "${BLUE}Starting dev stack (backend + frontend; DB = Supabase from .env)...${NC}"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev up -d backend frontend
        echo -e "${GREEN}✅ App running. Open http://localhost:3000 (Backend: http://localhost:8000)${NC}"
        echo -e "${YELLOW}Ensure .env has SUPABASE_DB_HOST (Supabase). First time? Run migrations: $0 migrate${NC}"
        ;;
    dev)
        check_env
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev up -d backend frontend
        echo -e "${GREEN}✅ Dev: Frontend http://localhost:3000 | Backend http://localhost:8000 (DB = Supabase)${NC}"
        ;;
    prod)
        check_env
        if [ ! -d "$PROJECT_ROOT/frontend/build" ]; then
            echo -e "${YELLOW}⚠ frontend/build not found. Run: REACT_APP_API_URL=http://localhost/api $0 deploy${NC}"
            exit 1
        fi
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile nginx up -d backend nginx
        echo -e "${GREEN}✅ Prod: http://localhost | Backend: http://localhost:8000 (DB = Supabase)${NC}"
        ;;
    deploy)
        check_env
        echo -e "${BLUE}Stopping all project containers...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev --profile nginx --profile migrations --profile local-db down 2>/dev/null || true
        export REACT_APP_API_URL="${REACT_APP_API_URL:-http://localhost/api}"
        echo -e "${BLUE}Building frontend (REACT_APP_API_URL=$REACT_APP_API_URL)...${NC}"
        cd "$PROJECT_ROOT/frontend" && npm ci && npm run build && cd "$PROJECT_ROOT"
        echo -e "${BLUE}Building backend...${NC}"
        run_compose "build" "backend"
        echo -e "${BLUE}Starting backend + frontend (prod; nginx serves static build; DB = Supabase)...${NC}"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile nginx up -d backend nginx
        echo -e "${GREEN}✅ Deployed. App: http://localhost | Backend: http://localhost:8000${NC}"
        echo -e "${YELLOW}If DB has no schema: ./infra/scripts/run.sh db migrate${NC}"
        echo -e "${YELLOW}Optional demo users + super admin: ./infra/scripts/run.sh db setup${NC}"
        ;;
    migrate)
        check_env
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile migrations up migrations
        echo -e "${GREEN}✅ Migrations completed${NC}"
        ;;
    stop)
        cd "$PROJECT_ROOT"
        if [ -n "$2" ]; then
            svc=$(resolve_service "$2")
            validate_service "$svc"
            docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" stop "$svc"
        else
            docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev --profile nginx --profile migrations --profile local-db down
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
    *) usage; ;;
esac
