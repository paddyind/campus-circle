# Infrastructure Documentation

This directory contains all Docker and infrastructure configuration files for the CampusCircle application.

## Dockerfiles

### `Dockerfile.frontend.dev`
**Purpose**: Development Dockerfile for the frontend service.

**Features**:
- Uses Node.js 18 Alpine for smaller image size
- Runs React development server (`npm start`) with hot-reload
- Generates Tailwind CSS on container startup
- Mounts source code as volume for live code changes
- Exposes port 3000 for development server

**Usage**: Used automatically when running `docker-compose` with `--profile dev`

### `Dockerfile.frontend`
**Purpose**: Production Dockerfile for the frontend service.

**Features**:
- Multi-stage build (build + serve)
- Stage 1: Builds React app with `npm run build`
- Stage 2: Serves static files with Nginx
- Optimized for production with minified assets
- Exposes port 80

**Usage**: Used for production deployments or when building with `--profile prod`

### `Dockerfile.backend`
**Purpose**: Backend API Dockerfile (FastAPI/Python).

**Features**:
- Uses Python 3.10 slim image
- Installs dependencies from `requirements.txt`
- Runs FastAPI with Uvicorn
- Exposes port 8000

### `Dockerfile.migrations`
**Purpose**: Database migrations Dockerfile.

**Features**:
- Uses PostgreSQL client tools
- Runs SQL migration files in order
- Waits for database to be ready before executing
- Used for one-time migration execution

## Docker Compose Configuration

### `docker-compose.yml`
Defines all services:
- **nginx**: Reverse proxy (production only, profile: `nginx`)
- **frontend**: React development server (profile: `dev`)
- **backend**: FastAPI backend service
- **migrations**: Database migration runner (profile: `migrations`)
- **db**: PostgreSQL database container

### Profiles
- `dev`: Development services (frontend dev server)
- `prod`: Production services (nginx + built frontend)
- `migrations`: Database migration service
- `nginx`: Nginx reverse proxy

## Nginx Configuration

### `nginx.conf`
Production reverse proxy configuration:
- Serves static frontend files
- Proxies `/api/*` to backend
- Proxies `/docs` to FastAPI Swagger UI
- Proxies `/openapi.json` to OpenAPI schema

## Usage

See the main [README.md](../README.md) for usage instructions.

For detailed Docker management commands, see [scripts/README.md](../scripts/README.md).

