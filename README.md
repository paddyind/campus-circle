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

> **📖 For detailed deployment instructions, including database migrations and production setup, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd campus-circle
```

### 2. Pre-Deployment Sanity Check

Run the sanity test script to verify your environment:

```bash
./scripts/sanity-test.sh
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
./scripts/docker-manage.sh build
```

#### Start Core Services (Database + Backend)

```bash
./scripts/docker-manage.sh start
```

This starts:
- PostgreSQL database (port 5432)
- FastAPI backend (port 8000)

#### Create Admin User (One-time Setup)

Create the admin user for Campus Circle:

```bash
./scripts/setup-admin.sh
```

**Admin credentials:**
- **Email**: `admin@campuscircle.com`
- **Password**: `password123`
- **Role**: `admin`

#### Create Test Users

After running migrations, create test users with confirmed emails:

```bash
./scripts/setup-test-users.sh
```

This creates test users via Supabase Admin API with confirmed emails and links them to `campus_circle` schema.

**Test user credentials:**
- **Parent**: `parent@campuscircle.com` / `password123`
- **Student**: `student@campuscircle.com` / `password123`

**Note**: For detailed information about all scripts, see [scripts/README.md](scripts/README.md).

#### Run Database Migrations

```bash
./scripts/docker-manage.sh migrate
```

This creates:
- `campus_circle` schema with all application tables
- `campus_circle_auth` schema for isolated authentication
- Seed data (schools, events, user roles)
- **Migration 009**: Updates students table for children under 14 support

#### Disable Email Confirmation (Development)

For development, disable email confirmation to avoid bounce issues and simplify testing:

```bash
./scripts/setup-admin.sh --disable-email-confirmation
```

This will guide you through disabling email confirmation in Supabase Dashboard.

**Note**: Email confirmation should be **enabled** in production for security.

#### Start Frontend (Development Mode)

```bash
./scripts/docker-manage.sh dev
```

This starts the React frontend with hot reload (port 3000).

#### Start Frontend (Production Mode)

```bash
./scripts/docker-manage.sh prod
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
./scripts/docker-manage.sh status
```

## 🐳 Docker Commands

```bash
# Start services
./scripts/docker-manage.sh start [service]

# Stop services
./scripts/docker-manage.sh stop [service]

# Restart services
./scripts/docker-manage.sh restart [service]

# Build images
./scripts/docker-manage.sh build [service]

# View logs
./scripts/docker-manage.sh logs [service]

# Check status
./scripts/docker-manage.sh status

# Run migrations
./scripts/docker-manage.sh migrate

# Development mode (frontend with hot reload)
./scripts/docker-manage.sh dev

# Production mode (nginx serving built frontend)
./scripts/docker-manage.sh prod
```

## 💾 Database Backup and Restore

### Create Backup

```bash
./scripts/backup-db.sh [backup-name]
```

Backups are stored in `backups/` directory and include:
- `campus_circle` schema (all tables, indexes, constraints)
- `campus_circle_auth` schema (authentication tables)
- All data from both schemas

### Restore from Backup

```bash
./scripts/restore-db.sh <backup-name>
```

**Warning**: This will drop and recreate the schemas. Make sure you have a backup before restoring.

## 📁 Project Structure

```
campus-circle/
├── backend/           # FastAPI backend application
├── frontend/          # React frontend application
├── infra/             # Docker and infrastructure configuration
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.frontend.dev
│   └── Dockerfile.migrations
├── migrations/        # Database migration scripts
├── database/          # Database schema and seed data
│   ├── DDL/          # Data Definition Language (schema)
│   └── DML/          # Data Manipulation Language (seed data)
├── scripts/           # Utility scripts
│   ├── docker-manage.sh  # Docker management
│   ├── setup-admin.sh    # Admin user setup
│   ├── setup-test-users.sh # Test users setup
│   ├── backup-db.sh      # Database backup
│   ├── restore-db.sh     # Database restore
│   └── README.md         # Scripts documentation
└── docs/              # Documentation
    ├── ARCHITECTURE.md    # System architecture
    └── DATABASE.md        # Database schema documentation
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
- [Scripts Documentation](scripts/README.md) - Comprehensive guide for all utility scripts
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

The application uses Supabase Auth for authentication:

- **Supabase Cloud**: Uses Supabase's built-in `auth.users` table
- **Local Development**: Uses `campus_circle_auth.users` for complete isolation

User accounts are created via the registration API and linked to profile tables (`campus_circle.parents` or `campus_circle.students`).

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
