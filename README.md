# CampusCircle

A modern, production-ready platform connecting schools, parents, and students through seamless event management and communication.

## 🚀 Features

- **Event Management**: Create, view, and register for campus events
- **Parent-Student Communication**: Seamless communication between parents and students
- **User Dashboards**: Separate dashboards for parents and students
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

### 2. Environment Setup

Copy the `.env.example` file to `.env` and configure your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `SUPABASE_DB_HOST`: Database host (use `db` for local Docker)
- `SUPABASE_DB_PORT`: Database port (default: `5432`)
- `SUPABASE_DB_NAME`: Database name
- `SUPABASE_DB_USER`: Database user
- `SUPABASE_DB_PASSWORD`: Database password

### 3. Start the Application

**Development Mode (with hot reload):**
```bash
./scripts/docker-manage.sh dev
```

**Production Mode:**
```bash
./scripts/docker-manage.sh prod
```

**Core Services Only:**
```bash
./scripts/docker-manage.sh start
```

### 4. Run Database Migrations

```bash
./scripts/docker-manage.sh migrate
```

### 5. Access the Application

- **Frontend**: http://localhost:3000 (dev) or http://localhost (prod)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📁 Project Structure

```
campus-circle/
├── backend/           # FastAPI backend application
├── frontend/          # React frontend application
├── infra/             # Docker and infrastructure configuration
├── migrations/        # Database migration scripts
├── scripts/           # Utility scripts
└── docs/              # Documentation
    ├── README.md      # Project documentation
    ├── ARCHITECTURE.md # System architecture
    ├── DATABASE.md    # Database schema and structure
    ├── USERGUIDE.md   # User guide
    └── SUPABASE_SETUP.md # Supabase configuration guide
```

## 🏗️ Architecture

CampusCircle follows a microservices architecture with the following components:

- **Frontend**: React SPA with Redux for state management
- **Backend**: FastAPI REST API
- **Database**: PostgreSQL (via Supabase or local Docker)
- **Reverse Proxy**: Nginx (production mode)

For detailed architecture information, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 📚 Documentation

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [User Guide](docs/USERGUIDE.md)
- [Database Schema](docs/DATABASE.md)
- [Supabase Setup Guide](SUPABASE_SETUP.md)
- [Docker Management Scripts](scripts/README.md)
- [Infrastructure Documentation](infra/README.md)

## 🐳 Docker Commands

The project includes a convenient management script:

```bash
# Start services
./scripts/docker-manage.sh start

# Start in development mode
./scripts/docker-manage.sh dev

# Start in production mode
./scripts/docker-manage.sh prod

# Build images
./scripts/docker-manage.sh build [service]

# View logs
./scripts/docker-manage.sh logs [service]

# Stop services
./scripts/docker-manage.sh stop [service]

# Run migrations
./scripts/docker-manage.sh migrate

# Check status
./scripts/docker-manage.sh status
```

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

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest
```

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contributing guidelines here]

## 📞 Support

For issues and questions, please open an issue on the repository.

