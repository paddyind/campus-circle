# Database Schema Documentation

## Overview

CampusCircle uses PostgreSQL as its primary database. The database can be hosted on Supabase (cloud) or run locally via Docker.

## Database Setup

### Local Development (Docker)

The application includes a PostgreSQL container that runs automatically when using Docker Compose. The database is configured via environment variables in `.env`.

### Supabase (Production)

For production, use Supabase's managed PostgreSQL database. Configure the connection via environment variables.

## Schema Structure

### Core Tables

#### `users`
Stores user account information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR | User email (unique) |
| password_hash | VARCHAR | Hashed password |
| role | VARCHAR | User role (parent/student) |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### `events`
Stores campus event information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR | Event title |
| description | TEXT | Event description |
| event_date | TIMESTAMP | Event date and time |
| location | VARCHAR | Event location |
| capacity | INTEGER | Maximum attendees |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### `registrations`
Tracks event registrations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | Foreign key to events |
| user_id | UUID | Foreign key to users |
| registered_at | TIMESTAMP | Registration timestamp |
| status | VARCHAR | Registration status |

### Relationships

- `registrations.event_id` → `events.id`
- `registrations.user_id` → `users.id`

## Migrations

Database migrations are located in the `migrations/` directory and are executed in order:

1. `001_init_schema.sql` - Creates core tables and schema
2. `002_seed_minimal.sql` - Seeds initial data
3. `003_add_users_table.sql` - Adds users table
4. `004_add_jwt_claim_function.sql` - Adds JWT claim function

## Running Migrations

```bash
# Using Docker
./scripts/docker-manage.sh migrate

# Manual execution
psql -h <host> -U <user> -d <database> -f migrations/001_init_schema.sql
```

## Authentication Schema

The application uses Supabase Auth, which includes:

- `auth.users` - Supabase-managed user authentication
- JWT tokens for API authentication
- Row-level security (RLS) policies

## Indexes

Key indexes for performance:

- `users.email` - Unique index for email lookups
- `events.event_date` - Index for date-based queries
- `registrations(event_id, user_id)` - Composite index for registration lookups

## Backup and Recovery

### Local Database

```bash
# Backup
docker exec campus-circle-db-1 pg_dump -U <user> <database> > backup.sql

# Restore
docker exec -i campus-circle-db-1 psql -U <user> <database> < backup.sql
```

### Supabase

Use Supabase dashboard or CLI for backups and point-in-time recovery.

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Tokens**: Authentication uses secure JWT tokens
3. **Row-Level Security**: Supabase RLS policies protect data access
4. **Connection Security**: Use SSL/TLS for database connections in production

## Environment Variables

Required database configuration:

```env
SUPABASE_DB_HOST=db
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_password
```

## Troubleshooting

### Connection Issues

1. Verify environment variables are set correctly
2. Check Docker container is running: `docker ps`
3. Verify network connectivity: `docker network ls`

### Migration Errors

1. Check migration order is correct
2. Verify database user has CREATE/ALTER permissions
3. Review migration logs for specific errors

