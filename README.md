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

### 4. Deploy and Start Services

#### Build Docker Images

```bash
./infra/scripts/docker-manage.sh build
```

#### Start Core Services (Database + Backend)

```bash
./infra/scripts/docker-manage.sh start
```

This starts:
- PostgreSQL database (port 5432)
- FastAPI backend (port 8000)

#### Create admin, parent, and student (after migrations)

From project root run:

```bash
./infra/scripts/setup-test-users.sh
```

The script uses **backend/requirements.txt** (creates `.venv` and installs from it if needed), then creates the three users in Supabase Auth and `campus_circle_auth.users`. Ensure `.env` has your Supabase DB host (e.g. `SUPABASE_DB_HOST=db.xxxx.supabase.co`).

**Credentials (also on Help page):** demo_admin@campuscircle.com | demo_parent@campuscircle.com | demo_student@campuscircle.com (password: password123)

#### Run Database Migrations

**Supabase or any Postgres** (using `.env`; no SQL editor needed):
```bash
python infra/scripts/db.py migrate
```

**Local Docker:**
```bash
./infra/scripts/docker-manage.sh migrate
```

This applies SQL files from `database/` when present (001_schema.sql, 002_seed.sql — schema including children-under-14 design, and sample data).

#### Disable Email Confirmation (Development)

For development, disable email confirmation to avoid bounce issues and simplify testing:

```bash
./infra/scripts/setup-test-users.sh --disable-email-confirmation
```

This will guide you through disabling email confirmation in Supabase Dashboard.

**Note**: Email confirmation should be **enabled** in production for security.

#### Start Frontend (Development Mode)

```bash
./infra/scripts/docker-manage.sh dev
```

This starts the React frontend with hot reload (port 3000).

#### Start Frontend (Production Mode)

```bash
./infra/scripts/docker-manage.sh prod
```

This starts Nginx serving the built frontend (port 80).

### 5. Access the Application

- **Frontend**: http://localhost:3000 (dev) or http://localhost (prod)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🧪 Validation and Testing

### Verify Database Setup

```bash
# Check if schemas exist
docker exec campus-circle-db-1 psql -U postgres -d postgres -c "\dn campus_circle*"

# Check tables
docker exec campus-circle-db-1 psql -U postgres -d postgres -c "\dt campus_circle.*"

# Verify seed data
docker exec campus-circle-db-1 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campus_circle.schools;"
docker exec campus-circle-db-1 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campus_circle.events;"
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

```bash
# Start services
./infra/scripts/docker-manage.sh start [service]

# Stop services
./infra/scripts/docker-manage.sh stop [service]

# Restart services
./infra/scripts/docker-manage.sh restart [service]

# Build images
./infra/scripts/docker-manage.sh build [service]

# View logs
./infra/scripts/docker-manage.sh logs [service]

# Check status
./infra/scripts/docker-manage.sh status

# Run migrations
./infra/scripts/docker-manage.sh migrate

# Development mode (frontend with hot reload)
./infra/scripts/docker-manage.sh dev

# Production mode (nginx serving built frontend)
./infra/scripts/docker-manage.sh prod
```

## 💾 Database Backup and Restore

### Create Backup

```bash
python infra/scripts/db.py backup
```

Backups are stored in `database/backup/` and include:
- `campus_circle` schema (all tables, indexes, constraints)
- `campus_circle_auth` schema (authentication tables)
- All data from both schemas

### Restore from Backup

```bash
python infra/scripts/db.py restore <path-to-backup.sql>
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
    └── DATABASE.md
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

## 🗄️ Database Schema

The application uses two isolated schemas:

- **`campus_circle`**: Application data (users, events, schools, etc.)
- **`campus_circle_auth`**: Isolated authentication (for portability)

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
