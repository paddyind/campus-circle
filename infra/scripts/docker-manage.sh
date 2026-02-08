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

usage() {
    echo -e "${BLUE}Campus Circle Docker Management${NC}"
    echo "Usage: $0 [COMMAND] [SERVICE]"
    echo "  start [service]    Start services (default: backend, db)"
    echo "  stop [service]     Stop services"
    echo "  restart [service]  Restart services"
    echo "  build [service]    Build images"
    echo "  logs [service]     Show logs"
    echo "  status             Service status"
    echo "  clean              Stop and remove containers/volumes"
    echo "  shell [service]    Shell in container"
    echo "  validate           Validate docker-compose"
    echo "  migrate            Run database migrations (Docker)"
    echo "  dev                Start with frontend dev server"
    echo "  prod               Start with nginx"
    echo "Services: ${SERVICES[*]}"
    echo "Examples: $0 start | $0 dev | $0 migrate"
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
            run_compose "up -d backend db"
            echo -e "${GREEN}✅ Core services started. Backend: http://localhost:8000${NC}"
            echo -e "${YELLOW}Tip: $0 dev (frontend) | $0 prod (nginx)${NC}"
        else
            run_compose "up -d" "$2"
        fi
        ;;
    dev)
        check_env
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev up -d backend db frontend
        echo -e "${GREEN}✅ Dev: Frontend http://localhost:3000 | Backend http://localhost:8000${NC}"
        ;;
    prod)
        check_env
        echo -e "${YELLOW}Build frontend first: cd frontend && npm run build${NC}"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] && { cd "$PROJECT_ROOT"; docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile nginx up -d backend db nginx; echo -e "${GREEN}✅ Prod: http://localhost${NC}"; } || echo "Cancelled."
        ;;
    migrate)
        check_env
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile migrations up migrations
        echo -e "${GREEN}✅ Migrations completed${NC}"
        ;;
    stop)  run_compose "stop" "$2"; ;;
    restart) run_compose "restart" "$2"; ;;
    build) check_env; run_compose "build --no-cache" "$2"; ;;
    logs)  run_compose "logs -f" "$2"; ;;
    status) run_compose "ps"; docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null) 2>/dev/null || true; ;;
    clean)
        read -p "Remove all containers and volumes? (y/N) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] && run_compose "down -v" && echo -e "${GREEN}✅ Cleaned${NC}" || echo "Cancelled."
        ;;
    shell)
        [ -z "$2" ] && { echo "Usage: $0 shell <service>"; exit 1; }
        validate_service "$2"
        cid=$(docker-compose -f "$COMPOSE_FILE" ps -q "$2")
        [ -z "$cid" ] && { echo "Container not running"; exit 1; }
        docker exec -it "$cid" /bin/sh || docker exec -it "$cid" /bin/bash
        ;;
    validate) docker-compose -f "$COMPOSE_FILE" config >/dev/null && echo -e "${GREEN}✅ Valid${NC}" || { docker-compose -f "$COMPOSE_FILE" config; exit 1; }; ;;
    *) usage; ;;
esac
