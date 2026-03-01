# CampusCircle

A modern, production-ready platform connecting schools, parents, and students through seamless event management and communication.

## 🚀 Features

- **Event Management**: Create, view, and register for campus events
- **Parent-Student Communication**: Seamless communication between parents and students
- **User Dashboards**: Separate dashboards for parents and students
- **Admin Features**: Manage events, users, and contact submissions
- **Authentication**: Secure JWT-based authentication via Supabase
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## 📋 Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git
- A Supabase account (for database and authentication)

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd campus-circle
```

### 2. Pre-Deployment Sanity Check

Run the sanity test script to verify your environment:

```bash
./infra/scripts/sanity-test.sh
```

This validates your configuration, Docker setup, migrations, and code structure.

### 3. Environment Setup

Create a `.env` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Configuration (for local PostgreSQL container)
SUPABASE_DB_HOST=db
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-secure-password-here

# Frontend API URL (optional)
REACT_APP_API_URL=http://localhost:8000/api

# Email Confirmation (for development, keep as false)
# Set to true in production and enable email confirmation in Supabase Dashboard
ENABLE_EMAIL_CONFIRMATION=false
```

**Get Supabase credentials from**: Supabase Dashboard → Settings → API

### 4. Run the Application (Prototype / MVP / Demo)

For **development and demo**, use dev mode. Production (Nginx on port 80) is for later.

#### One command: start the app (recommended)

```bash
./infra/scripts/docker-manage.sh run
```

This stops any existing containers, then starts backend + database + frontend dev server. Open **http://localhost:3000** in your browser.

#### Run database migrations and setup

From project root, use the script that runs with the project’s `backend/requirements.txt` (creates `.venv` if needed):

```bash
./infra/scripts/run.sh db setup
```

This applies migrations **001→005** (schema, seed, tenant registry, Demo-BHIS tenant, super_admins) and creates **demo users** (Demo-Circle + Demo-BHIS) and the **super admin** account. One command for a full demo-ready DB.

- **Supabase:** Set `.env` with `SUPABASE_DB_HOST=db.xxxx.supabase.co` (and other DB vars).
- **Local Docker:** Use `SUPABASE_DB_HOST=localhost` (or `db` if running from inside Docker), then run the command above. Alternatively: `./infra/scripts/docker-manage.sh migrate` then `./infra/scripts/run.sh db setup`.

**Demo credentials (see Help page):** demo_admin@campuscircle.com, demo_parent@campuscircle.com, demo_student@campuscircle.com; bhis_admin@campuscircle.com, etc. (password: password123). Super admin: superadmin@campuscircle.com (set `SUPER_ADMIN_PASSWORD` in `.env` or use default).

For step-by-step or other commands (migrate only, one tenant, backup), see [infra/scripts/README.md](infra/scripts/README.md).

#### Disable Email Confirmation (Development)

For development, disable email confirmation to avoid bounce issues and simplify testing:

```bash
./infra/scripts/setup-test-users.sh --disable-email-confirmation
```

This will guide you through disabling email confirmation in Supabase Dashboard.

**Note**: Email confirmation should be **enabled** in production for security.

#### Alternative: start step by step

```bash
./infra/scripts/docker-manage.sh build
./infra/scripts/docker-manage.sh start
./infra/scripts/run.sh db setup
./infra/scripts/docker-manage.sh dev
```

### 5. Access the Application

- **Frontend (dev/demo):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API docs:** http://localhost:8000/docs

**Production (later):** Use `./infra/scripts/docker-manage.sh deploy` or `prod` to serve the app on http://localhost (port 80). For prototype and MVP, use dev (port 3000).

## 🧪 Validation and Testing

### Pre-deployment sanity check

Run the automated sanity test (same as in CI) before deploying:

```bash
./infra/scripts/sanity-test.sh
```

This checks environment, Docker, database layout, backend/frontend structure, and docs. Fix any failures before deployment.

### Verify Database Setup

```bash
# Check if schemas exist
docker exec campus-circle-db psql -U postgres -d postgres -c "\dn campus_circle*"

# Check tables
docker exec campus-circle-db psql -U postgres -d postgres -c "\dt campus_circle.*"

# Verify seed data
docker exec campus-circle-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campus_circle.schools;"
docker exec campus-circle-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campus_circle.events;"
```

### Test API Endpoints

```bash
# Test root endpoint
curl http://localhost:8000/

# Test API docs
curl http://localhost:8000/docs

# Test events endpoint (may require authentication)
curl http://localhost:8000/api/events
```

### Check Service Status

```bash
./infra/scripts/docker-manage.sh status
```

## 🐳 Docker Commands

All from project root via **`./infra/scripts/docker-manage.sh`**:

```bash
# Dev: build + start backend + frontend (http://localhost:3000, backend :8000)
./infra/scripts/docker-manage.sh dev
# Or: run (stops existing, then same as dev)
./infra/scripts/docker-manage.sh run

# Other
./infra/scripts/docker-manage.sh start [service]   # backend only by default
./infra/scripts/docker-manage.sh stop [service]
./infra/scripts/docker-manage.sh build [service]
./infra/scripts/docker-manage.sh logs [service]
./infra/scripts/docker-manage.sh status
./infra/scripts/docker-manage.sh migrate
./infra/scripts/docker-manage.sh deploy           # prod: build frontend + backend, nginx
./infra/scripts/docker-manage.sh prod             # start prod stack (needs frontend/build)

# Mobile (run dev first so backend is up)
./infra/scripts/docker-manage.sh android         # build web, sync Capacitor, open Android Studio
./infra/scripts/docker-manage.sh ios             # build web, sync Capacitor, open Xcode
# Physical device on same Wi‑Fi:
REACT_APP_API_URL=http://YOUR_IP:8000/api ./infra/scripts/docker-manage.sh android
```

## 💾 Database Backup and Restore

### Create Backup

```bash
./infra/scripts/run.sh db backup
```

Backups are stored in `database/backup/` and include:
- `campus_circle` schema (all tables, indexes, constraints)
- `campus_circle_auth` schema (authentication tables)
- All data from both schemas

### Restore from Backup

```bash
./infra/scripts/run.sh db restore <path-to-backup.sql>
```

**Warning**: This will drop and recreate the schemas. Make sure you have a backup before restoring.

## 📁 Project Structure

```
campus-circle/
├── backend/           # FastAPI backend application
├── frontend/          # React frontend application
├── database/          # Schema/seed SQL (001, 002) and database/backup/ for backups
├── infra/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend   # Multi-stage: dev + prod
│   ├── nginx.conf
│   └── scripts/      # db.py, docker-manage.sh, setup-test-users, sanity-test
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    └── TENANTS_AND_DEPLOYMENT.md
```

## 🏗️ Architecture

CampusCircle follows a microservices architecture with the following components:

- **Frontend**: React SPA with Redux for state management
- **Backend**: FastAPI REST API
- **Database**: PostgreSQL (via Supabase or local Docker)
- **Reverse Proxy**: Nginx (production mode)

For detailed architecture information, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 📚 Documentation

- [Architecture Documentation](docs/ARCHITECTURE.md) - System architecture and design
- [Database Schema](docs/DATABASE.md) - Database structure and schema details
- [Tenants and Deployment](docs/TENANTS_AND_DEPLOYMENT.md) - Tenant model (Demo-Circle, baseline, new tenants), mobile app builds via Capacitor, deployment (Firebase, Cloud Run, free hosting)
- [Mobile testing (Android / iOS)](docs/MOBILE_TESTING.md) - Local: `docker-manage.sh android` / `ios`. CI: validate + build APK & iOS (no extra tools).
- [Scripts Documentation](infra/scripts/README.md) - Scripts for DB, Docker, setup
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

## 🔧 Development

### Frontend Development

```bash
cd frontend
npm install
npm start
```

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Applying code changes (restart / rebuild)

Code changes **do not apply** until the running services are restarted or rebuilt.

- **Running backend and frontend locally**  
  Stop the running processes (Ctrl+C), then start them again:
  - Backend: `cd backend && uvicorn app.main:app --reload`
  - Frontend: `cd frontend && npm start`

- **Using Docker**  
  Rebuild and recreate so containers use the new code:  
  `./infra/scripts/docker-manage.sh dev`  
  (This runs `up -d --build --force-recreate` for backend and frontend.)

- **Database (for new columns, e.g. cancellation cutoff)**  
  Run migrations after pulling or changing schema:
  ```bash
  ./infra/scripts/run.sh db migrate
  ```
  With Docker: `./infra/scripts/docker-manage.sh migrate`

## 🗄️ Database Schema

The application is **tenant-ready**. The default tenant is **Demo-Circle** (internal, with demo data). Its data lives in two schemas:

- **`campus_circle`**: Application data (users, events, schools, etc.)
- **`campus_circle_auth`**: Isolated authentication (for portability)

A **tenant registry** (`public.tenants`) lists all tenants; new client tenants get their own schemas (e.g. `tenant_<slug>`) with the same structure. See [docs/TENANTS_AND_DEPLOYMENT.md](docs/TENANTS_AND_DEPLOYMENT.md).

For detailed database documentation, see [docs/DATABASE.md](docs/DATABASE.md).

## 🔐 Authentication

The application uses Supabase Auth for authentication. Real users who register are created in Supabase's `auth.users`; the backend syncs them into `campus_circle_auth.users` and then into `campus_circle.users` and profile tables. There is no DB trigger—sync is in application code. See **[docs/AUTH_AND_REGISTRATION.md](docs/AUTH_AND_REGISTRATION.md)** for the full flow.

- **Optional**: Set `ALLOWED_EMAIL_DOMAINS` in `.env` (e.g. `campuscircle.com`) to restrict registration to specific domains and keep users application- or tenant-specific.
- User accounts are created via the registration API and linked to profile tables (`campus_circle.parents` or `campus_circle.students`).

### Parent-Child Management

- **Children Under 14**: Parents can add children under 14 without creating separate login accounts. These children are stored with minimal auth accounts and can be registered for events by their parents.
- **Children 14 and Older**: Must create their own student accounts via the student registration page.
- **API Endpoints**:
  - `GET /api/users/me/children` - Get all children for the current parent
  - `POST /api/users/me/children` - Add a child under 14 (requires parent role)
  - `POST /api/users/events/{event_id}/register` - Register for an event (accepts optional `student_id` for parents)

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contributing guidelines here]

## 📞 Support

For issues and questions, please open an issue on the repository.
