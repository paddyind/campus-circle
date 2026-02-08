# Database Schema Documentation

## Overview

CampusCircle uses PostgreSQL as its primary database. The database can be hosted on Supabase (cloud) or run locally via Docker. The application uses isolated schemas for complete portability.

## Schema Structure

### `campus_circle` Schema

All application tables are organized under the `campus_circle` schema to keep them separate from other projects and Supabase's default schemas.

**Domain**: campuscircle.com

### `campus_circle_auth` Schema

Isolated authentication schema for Campus Circle. This allows the application to be completely portable and recreatable independently.

**Note**: When using Supabase, the application uses Supabase's built-in `auth.users` table. The `campus_circle_auth` schema is used for local development or when you need complete isolation and portability.

## Database Setup

### Local Development (Docker)

The application includes a PostgreSQL container that runs automatically when using Docker Compose. The database is configured via environment variables in `.env`.

### Supabase (Production)

For production, use Supabase's managed PostgreSQL database. Configure the connection via environment variables.

## Schema Overview

### Core Tables

#### User Management

- **`campus_circle.users`** - User accounts linked to authentication
- **`campus_circle.user_roles`** - User role definitions (admin, event_owner, event_organizer, parent, student)
- **`campus_circle.parents`** - Parent user profiles
- **`campus_circle.students`** - Student user profiles
  - **Important**: Students can exist without auth accounts (children under 14)
  - **`id`**: UUID primary key (independent, not FK to auth.users)
  - **`email`**: Student email (defaults to parent's email, can be updated)
  - **`auth_user_id`**: Nullable FK to auth.users (set when student creates account at 14+)
- **`campus_circle.parent_students`** - Parent-student relationships
  - **Note**: Children under 14 can be added by parents without creating separate login accounts. These children are stored in `campus_circle.students` with `auth_user_id = NULL`. When they turn 14+, they can create their own account using their email, and `auth_user_id` will be set.

#### School Management

- **`campus_circle.schools`** - School information
- **`campus_circle.classes`** - Class/grade information

#### Event Management

- **`campus_circle.events`** - Event information
- **`campus_circle.event_registrations`** - Student event registrations
- **`campus_circle.event_updates`** - Event updates/announcements
- **`campus_circle.event_faqs`** - Event FAQs
- **`campus_circle.event_questions`** - Parent questions about events

#### Contact & Support

- **`campus_circle.contact_submissions`** - User contact submissions (feedback, complaints, suggestions)

#### Other Tables

- **`campus_circle.documents`** - Student documents
- **`campus_circle.audit_logs`** - Audit trail

### Authentication Schema

#### `campus_circle_auth.users`

Isolated authentication table for Campus Circle.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users when using Supabase) |
| email | TEXT | User email (unique) |
| encrypted_password | TEXT | Hashed password |
| email_confirmed_at | TIMESTAMPTZ | Email confirmation timestamp |
| created_at | TIMESTAMPTZ | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Database Setup

### 1. Run DDL Scripts (Schema Creation)

Execute the DDL scripts to create the schema and tables:

```bash
# Using Docker migrations (recommended)
./scripts/docker-manage.sh migrate

# Or manually using psql
psql -h localhost -U postgres -d postgres -f database/DDL/001_schema_campus_circle.sql

# Or via Supabase SQL Editor
# Copy and paste the contents of database/DDL/001_schema_circle.sql
```

### 2. Run DML Scripts (Seed Data)

Execute the DML scripts to populate initial data:

```bash
# Using Docker migrations
./scripts/docker-manage.sh migrate

# Or manually using psql
psql -h localhost -U postgres -d postgres -f database/DML/001_seed_data.sql

# Or via Supabase SQL Editor
# Copy and paste the contents of database/DML/001_seed_data.sql
```

### 3. Using Docker Migrations

The migrations in the `migrations/` directory are automatically run when using Docker. These migrations are based on the DDL files in `database/DDL/`.

## Migrations

Database migrations are located in the `migrations/` directory and are executed in order:

1. `001_init_schema.sql` - Creates core schemas and tables
2. `002_seed_minimal.sql` - Seeds initial data (schools, events)
3. `003_add_users_table.sql` - Adds users table and roles
4. `004_add_jwt_claim_function.sql` - Adds JWT claim function
5. `006_add_contact_feedback.sql` - Adds contact submissions table
6. `007_add_admin_setup.sql` - Adds admin setup functionality
7. `008_fix_event_registrations_constraint.sql` - Adds unique constraint to event registrations
8. `009_update_students_for_children_under_14.sql` - **Long-term solution**: Makes students.id independent, adds email and auth_user_id fields

### Running Migrations

```bash
# Using Docker (recommended)
./scripts/docker-manage.sh migrate

# Manual execution
psql -h <host> -U <user> -d <database> -f migrations/001_init_schema.sql
psql -h <host> -U <user> -d <database> -f migrations/002_seed_minimal.sql
psql -h <host> -U <user> -d <database> -f migrations/003_add_users_table.sql
psql -h <host> -U <user> -d <database> -f migrations/004_add_jwt_claim_function.sql
```

## Authentication

The application uses Supabase Auth for authentication.

**When using Supabase Cloud**:
- User accounts are created in Supabase's `auth.users` table
- These are then linked to `campus_circle.users` and the appropriate profile table (`campus_circle.parents` or `campus_circle.students`)

**When using local PostgreSQL or for portability**:
- User accounts are created in `campus_circle_auth.users` table
- This provides complete isolation and allows the application to be recreated independently

### Children Under 14 (Long-term Solution)

**Important Design Decision**: Children under 14 do not require auth accounts. This is a long-term architectural decision that provides:

1. **Simplified Onboarding**: Parents can add children without creating separate login accounts
2. **Email Management**: Children use parent's email by default, which can be updated later
3. **Future Account Creation**: When children turn 14+, they can create their own account using their email
4. **No Email Conflicts**: No need to generate unique emails for children

**Data Model**:
- `campus_circle.students.id` is now independent (not a FK to `auth.users`)
- `campus_circle.students.email` stores the child's email (defaults to parent's email)
- `campus_circle.students.auth_user_id` is NULL for children under 14
- When a child turns 14+ and creates an account, `auth_user_id` is set to link to their auth account

**Migration**: See `migrations/009_update_students_for_children_under_14.sql` for the complete schema changes.

## Test Users

Test users should be created through the application's registration API or Supabase Dashboard.

To create test users:

1. Use the registration API endpoints:
   - `POST /users/register/parent`
   - `POST /users/register/student`

2. Or create them manually in Supabase Dashboard:
   - Go to Authentication → Users
   - Create a new user
   - Then insert corresponding records in `campus_circle.users` and profile tables

## Backup and Restore

### Using Backup Scripts (Recommended)

The project includes convenient backup and restore scripts:

```bash
# Create a backup
./scripts/backup-db.sh [backup-name]

# Restore from backup
./scripts/restore-db.sh <backup-name>
```

The backup includes:
- `campus_circle` schema (all tables, indexes, constraints)
- `campus_circle_auth` schema (authentication tables)
- All data from both schemas

Backups are stored in the `backups/` directory with timestamps.

### Manual Backup

```bash
# Backup schema only
pg_dump -h localhost -U postgres -d postgres \
  --schema=campus_circle \
  --schema=campus_circle_auth \
  --schema-only \
  -f backup_schema.sql

# Backup data only
pg_dump -h localhost -U postgres -d postgres \
  --schema=campus_circle \
  --schema=campus_circle_auth \
  --data-only \
  -f backup_data.sql

# Full backup
pg_dump -h localhost -U postgres -d postgres \
  --schema=campus_circle \
  --schema=campus_circle_auth \
  -f backup_full.sql
```

### Manual Restore

```bash
# Restore from backup
psql -h localhost -U postgres -d postgres -f backup_full.sql
```

## Indexes

Key indexes for performance:

- `campus_circle.users.role` - Index for role-based queries
- `campus_circle.events.start_time` - Index for date-based queries
- `campus_circle.events.is_published` - Partial index for published events
- `campus_circle.event_registrations(event_id, student_id)` - Composite index for registration lookups
- `campus_circle_auth.users.email` - Unique index for email lookups

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Tokens**: Authentication uses secure JWT tokens
3. **Row-Level Security**: Supabase RLS policies protect data access (when using Supabase)
4. **Connection Security**: Use SSL/TLS for database connections in production
5. **Schema Isolation**: Separate schemas prevent cross-application data access

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
4. Ensure schemas don't already exist if running migrations multiple times

### Schema Issues

1. Verify schemas exist: `\dn campus_circle*`
2. Check table structure: `\dt campus_circle.*`
3. Verify foreign key constraints: `\d+ campus_circle.users`

## Notes

- All timestamps use `TIMESTAMPTZ` (timestamp with timezone)
- UUIDs are used for all primary keys
- Foreign key constraints ensure referential integrity
- Indexes are created for frequently queried columns
- The `campus_circle` schema keeps the application data isolated from other projects
- The `campus_circle_auth` schema provides isolated authentication for portability
- Both schemas can be backed up and restored independently using the provided scripts