#!/bin/bash
# docker-manage.sh - Manage Campus Circle Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/infra/docker-compose.yml"

# Available services
SERVICES=("nginx" "frontend" "backend" "db" "migrations")

# Function to print usage
usage() {
    echo -e "${BLUE}Campus Circle Docker Management Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [SERVICE]"
    echo ""
    echo "Commands:"
    echo "  start [service]    Start all services or a specific service (default: backend, db)"
    echo "  stop [service]     Stop all services or a specific service"
    echo "  restart [service]  Restart all services or a specific service"
    echo "  build [service]    Build all images or a specific service"
    echo "  logs [service]     Show logs for all services or a specific service"
    echo "  status             Show status of all services"
    echo "  clean              Stop and remove all containers, networks, and volumes"
    echo "  shell [service]    Open a shell in a running container"
    echo "  validate           Validate Docker Compose configuration"
    echo "  migrate            Run database migrations (one-time)"
    echo "  dev                Start with frontend dev server (port 3000)"
    echo "  prod               Start with nginx serving built frontend (port 80)"
    echo ""
    echo "Services:"
    for service in "${SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start all services"
    echo "  $0 start backend      # Start only backend service"
    echo "  $0 stop frontend      # Stop only frontend service"
    echo "  $0 logs backend       # View backend logs"
    echo "  $0 shell backend      # Open shell in backend container"
    exit 1
}

# Function to check if .env file exists
check_env() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${YELLOW}⚠️  Warning: .env file not found!${NC}"
        echo -e "${YELLOW}   Creating from .env.example...${NC}"
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            echo -e "${YELLOW}   Please edit .env file with your Supabase credentials${NC}"
        else
            echo -e "${RED}❌ Error: .env.example not found!${NC}"
            exit 1
        fi
    fi
}

# Function to validate service name
validate_service() {
    local service=$1
    if [[ ! " ${SERVICES[@]} " =~ " ${service} " ]]; then
        echo -e "${RED}❌ Error: Invalid service '$service'${NC}"
        echo -e "${YELLOW}Available services: ${SERVICES[*]}${NC}"
        exit 1
    fi
}

# Function to run docker-compose command
run_compose() {
    local cmd=$1
    local service=$2
    
    cd "$PROJECT_ROOT"
    
    # Explicitly load .env file from project root
    local env_file="$PROJECT_ROOT/.env"
    
    # Set project name to campus-circle
    local project_name="campus-circle"
    
    # Parse command for profiles (e.g., "--profile dev up -d")
    if [[ "$cmd" == *"--profile"* ]]; then
        # Command already includes profile flag
        docker-compose --project-name "$project_name" --env-file "$env_file" -f "$COMPOSE_FILE" $cmd
    elif [ -z "$service" ]; then
        docker-compose --project-name "$project_name" --env-file "$env_file" -f "$COMPOSE_FILE" $cmd
    else
        validate_service "$service"
        docker-compose --project-name "$project_name" --env-file "$env_file" -f "$COMPOSE_FILE" $cmd "$service"
    fi
}

# Main command handler
case "${1:-}" in
    start)
        check_env
        echo -e "${GREEN}🚀 Starting services...${NC}"
        if [ -z "$2" ]; then
            # Default: start only backend and db (no frontend, no nginx, no migrations)
            run_compose "up -d backend db"
            echo -e "${GREEN}✅ Core services started!${NC}"
            echo -e "${BLUE}📋 Access points:${NC}"
            echo -e "   Backend API: http://localhost:8000"
            echo -e "   API Docs: http://localhost:8000/docs"
            echo -e "${YELLOW}💡 Tip: Use './scripts/docker-manage.sh dev' for frontend dev server" && echo -e "   Or './scripts/docker-manage.sh prod' for nginx with built frontend${NC}"
        else
            run_compose "up -d" "$2"
            echo -e "${GREEN}✅ Service '$2' started!${NC}"
        fi
        ;;
    
    dev)
        check_env
        echo -e "${GREEN}🚀 Starting development environment (with frontend dev server)...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile dev up -d backend db frontend
        echo -e "${GREEN}✅ Development services started!${NC}"
        echo -e "${BLUE}📋 Access points:${NC}"
        echo -e "   Frontend Dev: http://localhost:3000"
        echo -e "   Backend API: http://localhost:8000"
        echo -e "   API Docs: http://localhost:8000/docs"
        ;;
    
    prod)
        check_env
        echo -e "${GREEN}🚀 Starting production environment (with nginx)...${NC}"
        echo -e "${YELLOW}⚠️  Make sure frontend is built first!${NC}"
        echo -e "${YELLOW}   Run: cd frontend && npm run build${NC}"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$PROJECT_ROOT"
            docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile nginx up -d backend db nginx
            echo -e "${GREEN}✅ Production services started!${NC}"
            echo -e "${BLUE}📋 Access points:${NC}"
            echo -e "   Frontend (Nginx): http://localhost"
            echo -e "   Backend API: http://localhost/api"
            echo -e "   API Docs: http://localhost/docs"
        else
            echo -e "${YELLOW}Cancelled.${NC}"
        fi
        ;;
    
    migrate)
        check_env
        echo -e "${GREEN}🗄️  Running database migrations...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose --project-name campus-circle --env-file "$PROJECT_ROOT/.env" -f "$COMPOSE_FILE" --profile migrations up migrations
        echo -e "${GREEN}✅ Migrations completed!${NC}"
        ;;
    
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        if [ -z "$2" ]; then
            run_compose "stop"
            echo -e "${GREEN}✅ All services stopped!${NC}"
        else
            run_compose "stop" "$2"
            echo -e "${GREEN}✅ Service '$2' stopped!${NC}"
        fi
        ;;
    
    restart)
        check_env
        echo -e "${BLUE}🔄 Restarting services...${NC}"
        if [ -z "$2" ]; then
            run_compose "restart"
            echo -e "${GREEN}✅ All services restarted!${NC}"
        else
            run_compose "restart" "$2"
            echo -e "${GREEN}✅ Service '$2' restarted!${NC}"
        fi
        ;;
    
    build)
        check_env
        echo -e "${BLUE}🔨 Building images...${NC}"
        if [ -z "$2" ]; then
            run_compose "build --no-cache"
            echo -e "${GREEN}✅ All images built!${NC}"
        else
            validate_service "$2"
            run_compose "build --no-cache" "$2"
            echo -e "${GREEN}✅ Image for '$2' built!${NC}"
        fi
        ;;
    
    logs)
        if [ -z "$2" ]; then
            run_compose "logs -f"
        else
            validate_service "$2"
            run_compose "logs -f" "$2"
        fi
        ;;
    
    status)
        echo -e "${BLUE}📊 Service Status:${NC}"
        run_compose "ps"
        echo ""
        echo -e "${BLUE}📈 Resource Usage:${NC}"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f "$COMPOSE_FILE" ps -q) 2>/dev/null || echo "No running containers"
        ;;
    
    clean)
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        read -p "This will remove all containers, networks, and volumes. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_compose "down -v"
            echo -e "${GREEN}✅ Cleanup complete!${NC}"
        else
            echo -e "${YELLOW}Cancelled.${NC}"
        fi
        ;;
    
    shell)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Error: Service name required for shell command${NC}"
            echo -e "${YELLOW}Usage: $0 shell [service]${NC}"
            exit 1
        fi
        validate_service "$2"
        echo -e "${BLUE}🐚 Opening shell in '$2' container...${NC}"
        CONTAINER_NAME=$(docker-compose -f "$COMPOSE_FILE" ps -q "$2")
        if [ -z "$CONTAINER_NAME" ]; then
            echo -e "${RED}❌ Error: Container '$2' is not running${NC}"
            exit 1
        fi
        docker exec -it "$CONTAINER_NAME" /bin/sh || docker exec -it "$CONTAINER_NAME" /bin/bash
        ;;
    
    validate)
        echo -e "${BLUE}🔍 Validating Docker Compose configuration...${NC}"
        if docker-compose -f "$COMPOSE_FILE" config > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Docker Compose configuration is valid!${NC}"
        else
            echo -e "${RED}❌ Error: Invalid Docker Compose configuration${NC}"
            docker-compose -f "$COMPOSE_FILE" config
            exit 1
        fi
        ;;
    
    *)
        usage
        ;;
esac

