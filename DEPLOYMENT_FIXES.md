# Deployment Fixes Summary

This document summarizes all the fixes applied to make the Campus Circle application ready for Docker deployment.

## Changes Made

### 1. Frontend Development Dockerfile
**File**: `infra/Dockerfile.frontend.dev`
- Created a new development-friendly Dockerfile for the frontend
- Uses Node.js 18 Alpine image
- Runs `npm start` for hot-reload development
- Exposes port 3000 for the React development server
- Includes volume mounts for live code reloading

### 2. Updated Docker Compose Configuration
**File**: `infra/docker-compose.yml`

**Frontend Service:**
- Changed from production Dockerfile to development Dockerfile (`Dockerfile.frontend.dev`)
- Added `REACT_APP_API_URL` environment variable
- Added `CHOKIDAR_USEPOLLING=true` for file watching in Docker
- Added `/app/node_modules` volume to prevent host node_modules override
- Added `stdin_open: true` and `tty: true` for interactive terminal

**Backend Service:**
- Added Supabase environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 3. Enhanced Nginx Configuration
**File**: `infra/nginx.conf`
- Added proxy routes for `/docs` (FastAPI Swagger UI)
- Added proxy route for `/openapi.json` (OpenAPI schema)
- Improved API routing configuration

### 4. Docker Management Script
**File**: `scripts/docker-manage.sh`
- Comprehensive script for managing Docker containers
- Supports all services: nginx, frontend, backend, db, migrations
- Commands: start, stop, restart, build, logs, status, clean, shell, validate
- Automatic `.env` file validation and creation
- Color-coded output for better UX
- Service-specific operations support

### 5. Environment Configuration
**File**: `.env.example`
- Template for required environment variables
- Includes Supabase configuration placeholders
- Includes local database configuration

**File**: `SUPABASE_SETUP.md`
- Comprehensive guide for Supabase setup
- Step-by-step instructions
- Troubleshooting section
- Security best practices

## Supabase Configuration Required

To deploy the application, you need the following Supabase credentials:

### Required Environment Variables

Create a `.env` file in the project root with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Configuration (for local PostgreSQL container)
SUPABASE_DB_HOST=db
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-secure-password-here
```

### How to Get Supabase Credentials

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (or create a new one)
3. **Navigate to Settings → API**
4. **Copy the following:**
   - **Project URL** → Use as `SUPABASE_URL`
   - **anon public key** → Use as `SUPABASE_ANON_KEY`
   - **service_role secret key** → Use as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: 
- Never commit the `.env` file to version control
- The `SUPABASE_SERVICE_ROLE_KEY` is secret - keep it secure
- The `SUPABASE_ANON_KEY` is safe to use in client-side code

### Database Migrations

The application includes SQL migration files in `migrations/`:
- `001_init_schema.sql` - Creates database schema
- `002_seed_minimal.sql` - Seeds initial data
- `003_add_users_table.sql` - Adds users table
- `004_add_jwt_claim_function.sql` - Adds JWT claim function

**Migrations run automatically** when you start the services using the local PostgreSQL container.

If using Supabase cloud database, run these migrations manually in the SQL Editor.

## Quick Start Guide

### 1. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env  # or use your preferred editor
```

### 2. Validate Configuration
```bash
./scripts/docker-manage.sh validate
```

### 3. Build and Start Services
```bash
# Build all images
./scripts/docker-manage.sh build

# Start all services
./scripts/docker-manage.sh start
```

### 4. Verify Services
```bash
# Check status
./scripts/docker-manage.sh status

# View logs
./scripts/docker-manage.sh logs

# Test endpoints
curl http://localhost:8000/          # Backend health
curl http://localhost:8000/docs      # API documentation
curl http://localhost:3000/           # Frontend
curl http://localhost/                # Nginx proxy
```

## Service Access Points

After starting services, access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Nginx Proxy**: http://localhost (routes to frontend and `/api` to backend)
- **Database**: localhost:5432 (PostgreSQL)

## Common Operations

### Start/Stop Services
```bash
# Start all
./scripts/docker-manage.sh start

# Start specific service
./scripts/docker-manage.sh start backend

# Stop all
./scripts/docker-manage.sh stop

# Restart
./scripts/docker-manage.sh restart backend
```

### View Logs
```bash
# All services
./scripts/docker-manage.sh logs

# Specific service
./scripts/docker-manage.sh logs backend
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
./scripts/docker-manage.sh build frontend
./scripts/docker-manage.sh restart frontend

# Rebuild all
./scripts/docker-manage.sh build
./scripts/docker-manage.sh restart
```

### Debugging
```bash
# Open shell in container
./scripts/docker-manage.sh shell backend
./scripts/docker-manage.sh shell frontend

# Check service status and resource usage
./scripts/docker-manage.sh status
```

### Clean Up
```bash
# Stop and remove everything (including volumes)
./scripts/docker-manage.sh clean
```

## Troubleshooting

### Services won't start
1. Check `.env` file exists and has correct values
2. Validate configuration: `./scripts/docker-manage.sh validate`
3. Check logs: `./scripts/docker-manage.sh logs`

### Frontend not loading
1. Check frontend logs: `./scripts/docker-manage.sh logs frontend`
2. Verify port 3000 is not in use
3. Check React app is building: `./scripts/docker-manage.sh shell frontend` then `npm run build`

### Backend connection errors
1. Verify Supabase credentials in `.env`
2. Check backend logs: `./scripts/docker-manage.sh logs backend`
3. Test Supabase connection: `curl http://localhost:8000/`

### Database migration errors
1. Check database is running: `./scripts/docker-manage.sh status`
2. Check migration logs: `./scripts/docker-manage.sh logs migrations`
3. Verify database credentials in `.env`

## Next Steps

1. ✅ Environment file created (`.env.example` provided)
2. ✅ Docker configuration fixed
3. ✅ Management script created
4. ⏳ **Add your Supabase credentials to `.env`**
5. ⏳ **Run `./scripts/docker-manage.sh build`**
6. ⏳ **Run `./scripts/docker-manage.sh start`**
7. ⏳ **Test the application**

For detailed Supabase setup instructions, see `SUPABASE_SETUP.md`.

