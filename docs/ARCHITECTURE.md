# Architecture

This document provides a high-level overview of the CampusCircle system architecture, including its service boundaries, data flow, and technology stack.

## System Overview

CampusCircle is a modern, containerized, multi-service application designed to connect schools and parents through a seamless events platform. It features a React frontend, a FastAPI backend, and a Supabase-backed datastore, all running in a containerized environment orchestrated by Docker Compose.

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│              Frontend (React + Redux)                   │
│              Port: 3000 (dev) / 80 (prod)               │
└────────────────────┬────────────────────────────────────┘
                     │ API Calls
                     │
┌────────────────────▼────────────────────────────────────┐
│         Nginx Reverse Proxy (Production)                │
│         Port: 80                                        │
└────┬───────────────────────────────────────┬───────────┘
     │                                       │
     │ /api/*                                │ /*
     │                                       │
┌────▼──────────┐                  ┌────────▼──────────┐
│   Backend     │                  │   Frontend         │
│   (FastAPI)   │                  │   (Static Files)   │
│   Port: 8000  │                  │                   │
└────┬──────────┘                  └───────────────────┘
     │
     │ Database Queries
     │
┌────▼───────────────────────────────────────────────────┐
│         PostgreSQL Database                             │
│         - campus_circle schema                          │
│         - campus_circle_auth schema                     │
│         Port: 5432                                      │
└─────────────────────────────────────────────────────────┘
```

## Service Boundaries

The CampusCircle application is composed of the following services:

### Frontend Service

- **Technology**: React SPA with Redux for state management
- **Purpose**: User interface and user experience
- **Ports**: 
  - Development: 3000 (with hot reload)
  - Production: 80 (served via Nginx)
- **Features**:
  - Responsive design with Tailwind CSS
  - Client-side routing with React Router
  - State management with Redux Toolkit
  - Real-time updates via API polling

### Backend Service

- **Technology**: FastAPI (Python)
- **Purpose**: Business logic, data processing, and API endpoints
- **Port**: 8000
- **Features**:
  - RESTful API design
  - JWT-based authentication
  - Automatic API documentation (Swagger/OpenAPI)
  - Async request handling

### Database Service

- **Technology**: PostgreSQL
- **Purpose**: Primary data store
- **Port**: 5432
- **Schemas**:
  - `campus_circle`: Application data
  - `campus_circle_auth`: Isolated authentication
- **Deployment Options**:
  - Local: Docker container
  - Production: Supabase managed database
- **Data safety:** The app does not modify Supabase Auth tables; it only uses the Supabase Auth HTTP API. All DB writes go to app schemas (`campus_circle`, `campus_bhis`, `public.tenants`). Migrations add indexes on hot paths (events, registrations, users); they are idempotent (`CREATE IF NOT EXISTS`).

### Frontend (Production) / Reverse Proxy

- **Container name**: `campus-circle-frontend` (Nginx image)
- **Technology**: Nginx
- **Purpose**: Serves the built frontend (static files) and routes `/api/*` to the backend
- **Port**: 80
- **Features**:
  - Serves frontend static files from `frontend/build`
  - Routes `/api/*` to backend
  - SSL/TLS termination (when configured)

## Data Flow

1. **User Request**: The user interacts with the React frontend in their browser.
2. **API Request**: The frontend sends API requests to the backend (directly in dev, via Nginx in prod).
3. **Request Processing**: The backend processes the requests, validates authentication, and interacts with the database.
4. **Database Query**: The backend executes queries against PostgreSQL (local or Supabase).
5. **Response**: The backend returns JSON responses to the frontend.
6. **UI Update**: The frontend receives the response and updates the UI accordingly.

## Authentication Flow

1. **User Registration/Login**: User submits credentials via frontend.
2. **Backend Authentication**: Backend calls Supabase Auth API to authenticate.
3. **JWT Token**: Supabase returns a JWT token.
4. **Token Storage**: Frontend stores token in localStorage.
5. **API Requests**: Frontend includes token in Authorization header for protected endpoints.
6. **Token Validation**: Backend validates JWT token on each request.
7. **User Context**: Backend extracts user information from token.

## Technology Stack

### Frontend

- **Framework**: React 18
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **HTTP Client**: Fetch API
- **Build Tool**: Create React App

### Backend

- **Framework**: FastAPI (Python 3.10)
- **Authentication**: Supabase Auth (JWT)
- **Database Client**: Supabase Python Client
- **API Documentation**: Swagger/OpenAPI (automatic)
- **Validation**: Pydantic

### Database

- **Database**: PostgreSQL 15
- **ORM**: Supabase Client (PostgREST)
- **Migrations**: SQL scripts
- **Backup**: pg_dump scripts

### Infrastructure

- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx (production)
- **Process Management**: Docker Compose

## Deployment Architecture

### Development Mode

```
Frontend (React Dev Server) → Backend (FastAPI) → Database (PostgreSQL)
     Port 3000                    Port 8000            Port 5432
```

### Production Mode

```
campus-circle-frontend (Nginx) → Static files + proxy /api → Backend → Database
Port 80                              Port 8000                Port 5432
```

## Multi-Tenancy (Product Model)

CampusCircle is structured for **tenant-based productization**:

- **Default tenant: Demo-Circle** — The current deployment is the internal/default tenant "Demo-Circle". Its data lives in schemas `campus_circle` and `campus_circle_auth`. Demo-Circle has demo data and (in a future phase) admin privileges to create new client tenants.
- **Tenant registry** — Table `public.tenants` lists all tenants (name, slug, schema_app, schema_auth, is_internal). See migration `003_tenants_multitenancy.sql`.
- **Future clients** — New tenants get their own schemas (e.g. `tenant_<slug>`) with the same structure as the baseline; data is fully separated by schema. See [TENANTS_AND_DEPLOYMENT.md](TENANTS_AND_DEPLOYMENT.md).

For the current (first) phase, the app always uses Demo-Circle’s schemas; tenant resolution and create-tenant flows are planned for later phases.

## Database Architecture

### Schema Isolation

The application uses isolated schemas per tenant. For **Demo-Circle** (default):

- **`campus_circle`**: All application tables
- **`campus_circle_auth`**: Isolated authentication (for local dev)

### Key Relationships

- `campus_circle.users` → `campus_circle_auth.users` (or Supabase `auth.users`)
- `campus_circle.parents` → `campus_circle.users`
- `campus_circle.students` → `campus_circle.users`
- `campus_circle.events` → `campus_circle.schools`
- `campus_circle.event_registrations` → `campus_circle.events` + `campus_circle.students`

## Security Architecture

1. **Authentication**: JWT tokens via Supabase Auth
2. **Authorization**: Role-based access control (RBAC)
3. **Data Isolation**: Schema-level isolation
4. **API Security**: Token validation on protected endpoints
5. **Database Security**: Row-level security (RLS) when using Supabase

## Event Storage and Features

- **Event resources**: Local filesystem storage (configurable via `STORAGE_BASE_PATH`) for all file types (documents, media, agreements) per event. Organized as `{tenant_slug}/events/{event_id}/{category}/`. Folder/category organization protects or allows access (visibility: public, participants-only, private).
- **Calendar import**: Upload iCal/ICS files to bulk-add or update events. Controlled by tenant setting `features.calendar_import`.
- **Calendar view**: Month-by-month view with list toggle and split panel (details left/right). Controlled by tenant setting `features.calendar_view`.
- **Tenant feature flags**: `features.event_storage`, `features.calendar_import`, `features.calendar_view` in `public.tenants.settings`. Base/Parent (Demo) tenant has all enabled by default.

## Scalability Considerations

- **Horizontal Scaling**: Backend can be scaled by running multiple instances
- **Database Scaling**: Can migrate to Supabase for managed scaling
- **Caching**: Can add Redis for session/cache management
- **CDN**: Frontend static files can be served via CDN
- **Storage**: Event resources use local filesystem; future SaaS tiers can switch to S3/MinIO via config

## Monitoring and Logging

- **Application Logs**: Docker container logs
- **Database Logs**: PostgreSQL logs
- **API Monitoring**: FastAPI automatic metrics
- **Error Tracking**: Application-level error handling

## Backup and Recovery

- **Database Backups**: Via `./infra/scripts/run.sh db backup` (writes to `database/backup/`)
- **Schema Isolation**: Allows independent backup/restore
- **Point-in-Time Recovery**: Available via Supabase (production)

For detailed database schema information, see [DATABASE.md](DATABASE.md). For the tenant model, baseline, and deployment (Firebase and free hosting), see [TENANTS_AND_DEPLOYMENT.md](TENANTS_AND_DEPLOYMENT.md).
