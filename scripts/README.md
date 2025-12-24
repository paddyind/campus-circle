# Scripts Directory

This directory contains utility scripts for managing the Campus Circle application.

## docker-manage.sh

A comprehensive Docker management script for starting, stopping, building, and managing all services.

### Usage

```bash
./scripts/docker-manage.sh [COMMAND] [SERVICE]
```

### Commands

- **start [service]** - Start all services or a specific service
- **stop [service]** - Stop all services or a specific service
- **restart [service]** - Restart all services or a specific service
- **build [service]** - Build all images or a specific service
- **logs [service]** - Show logs for all services or a specific service
- **status** - Show status of all services
- **clean** - Stop and remove all containers, networks, and volumes
- **shell [service]** - Open a shell in a running container
- **validate** - Validate Docker Compose configuration

### Services

- `nginx` - Nginx reverse proxy
- `frontend` - React frontend application
- `backend` - FastAPI backend application
- `db` - PostgreSQL database
- `migrations` - Database migration runner

### Examples

```bash
# Start all services
./scripts/docker-manage.sh start

# Start only backend
./scripts/docker-manage.sh start backend

# Stop frontend
./scripts/docker-manage.sh stop frontend

# View backend logs
./scripts/docker-manage.sh logs backend

# Check service status
./scripts/docker-manage.sh status

# Open shell in backend container
./scripts/docker-manage.sh shell backend

# Rebuild and restart all services
./scripts/docker-manage.sh build
./scripts/docker-manage.sh start

# Clean everything (removes volumes)
./scripts/docker-manage.sh clean
```

### Quick Start

1. **First time setup:**
   ```bash
   # Copy environment file
   cp .env.example .env
   # Edit .env with your Supabase credentials
   
   # Build and start all services
   ./scripts/docker-manage.sh build
   ./scripts/docker-manage.sh start
   ```

2. **Daily development:**
   ```bash
   # Start services
   ./scripts/docker-manage.sh start
   
   # View logs
   ./scripts/docker-manage.sh logs
   
   # Stop services
   ./scripts/docker-manage.sh stop
   ```

3. **After code changes:**
   ```bash
   # Rebuild specific service
   ./scripts/docker-manage.sh build frontend
   ./scripts/docker-manage.sh restart frontend
   ```

## verify_docs_sync.sh

Placeholder script for verifying documentation synchronization with code changes.

