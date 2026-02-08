# Database Schema Documentation

## Overview

CampusCircle uses PostgreSQL as its primary database. The database can be hosted on Supabase (cloud) or run locally via Docker. The application uses isolated schemas for complete portability.

## Schema Structure

**Only two schemas are used:** `campus_circle` and `campus_circle_auth`. Any legacy schema named `campus-circle` (with hyphen) is dropped when you run migrations or reset.

### `campus_circle` Schema

All application tables are organized under the `campus_circle` schema to keep them separate from other projects and Supabase's default schemas.

**Domain**: campuscircle.com

### `campus_circle_auth` Schema

Isolated authentication schema for Campus Circle. This allows the application to be completely portable and recreatable independently.

**Note**: When using Supabase, sign-in uses Supabase's `auth.users` table. The app keeps a mirror in `campus_circle_auth.users` (synced in application code on registration and by `setup-test-users.sh` for demo users). There is no DB trigger; see [Auth and Registration](AUTH_AND_REGISTRATION.md).

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

Mirror of auth users for portability. When using **Supabase**, users are created in `auth.users`; the **backend** syncs them into `campus_circle_auth.users` on registration (parent/student), and `./infra/scripts/setup-test-users.sh` syncs demo users. There is no database trigger—sync is application-driven. See [AUTH_AND_REGISTRATION.md](AUTH_AND_REGISTRATION.md). If `campus_circle_auth.users` is empty, run migrations, then `./infra/scripts/setup-test-users.sh` (with `.env` pointing at your Supabase DB).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (matches auth.users id when using Supabase) |
| email | TEXT | User email (unique) |
| encrypted_password | TEXT | Hashed password |
| email_confirmed_at | TIMESTAMPTZ | Email confirmation timestamp |
| created_at | TIMESTAMPTZ | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Database Setup and Migrations

Schema and seed data live in the **`database/`** directory. The structure is in place even when there is no migration data; when present, SQL files are applied in order. Use the same credentials as the app (`.env`) so you can update Supabase or local Postgres without opening the SQL editor.

### SQL files (when present)

1. **`001_schema.sql`** – Full schema (auth, users, schools, events, contact_submissions, etc.). The `students` table includes children-under-14 design: independent `id`, optional `email`, nullable `auth_user_id`.
2. **`002_seed.sql`** – Sample data (user_roles, schools, classes, Demo_ events). Users are created via `setup-test-users.sh`.

### Running Migrations (using .env)

**Supabase or any Postgres** (recommended – no SQL editor needed):

```bash
# Apply or update schema and seed (idempotent)
python infra/scripts/db.py migrate
```

**Fresh database** (drop and recreate schemas, then apply 001 and 002):

```bash
python infra/scripts/db.py reset
```

**Docker** (local DB only):

```bash
./infra/scripts/docker-manage.sh migrate
```

Requires: `psycopg2-binary` and a `.env` with `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`. Optional: `SUPABASE_DB_SSLMODE=require` for Supabase.

**Supabase when deployed:** The app uses only these env vars (no infra logic in code). If you see "Network is unreachable" to the DB, use Supabase's connection pooler: in Dashboard → Database → **Connect** → Connection pooling, choose **Transaction** (port 6543, same host) or **Session** (pooler host + port 5432, user `postgres.<project-ref>`). Set `SUPABASE_DB_SSLMODE=require`. See `.env.example` for details.

## Authentication

The application uses Supabase Auth for authentication. **Real users** who register go into Supabase's `auth.users`; the backend syncs them into `campus_circle_auth.users` and then into `campus_circle.users` and the appropriate profile table. There is no migrate-step sync; see **[AUTH_AND_REGISTRATION.md](AUTH_AND_REGISTRATION.md)** for the full flow and how to restrict sign-ups by email domain (e.g. to keep users tenant- or application-specific).

### Children Under 14 (Long-term Solution)

**Important Design Decision**: Children under 14 do not require auth accounts. This eliminates unique-email generation and auth-account creation for children.

**Design principles**:
1. **No Auth Accounts for Children Under 14**: Children don't need login accounts, so we don't create them.
2. **Parent Email by Default**: Children use their parent's email by default, which can be updated later.
3. **Future Account Creation**: When children turn 14+, they can create their own account using their email.
4. **No Email Conflicts**: Use parent's email or a custom email set by the parent.

**Data model**:
- `campus_circle.students.id` is independent (not a FK to `auth.users`)
- `campus_circle.students.email` stores the child's email (defaults to parent's email)
- `campus_circle.students.auth_user_id` is NULL for children under 14; set when the child creates an account at 14+

**API**:
- **POST /api/users/me/children**: Creates student record directly (no auth account). Body: `full_name`, `dob`, optional `email` (defaults to parent's email).
- **PUT /api/users/me/children/{child_id}**: Parents can update child info, including email.
- **GET /api/users/me/children**: Returns children with `email` and `auth_user_id`.

**Workflow**: Parent adds child (name, optional email, DOB under 14) → student row created with `auth_user_id = NULL`. Parent can update child email later. When the child turns 14+, they can register with that email and the system can link via `auth_user_id`.

**Schema**: The `students` table in `001_schema.sql` defines this. Related: `backend/app/api/users.py`, `backend/app/schemas.py` (ChildCreate, ChildUpdate), frontend `AddChildModal.js`, `ChildSelectionModal.js`.

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

Backups and optional initial/demo data live in **`database/backup/`**. Use the database script (reads credentials from `.env`):

```bash
# Create a backup (writes to database/backup/backup_YYYYMMDD_HHMMSS.sql)
python infra/scripts/db.py backup

# Restore from a backup file
python infra/scripts/db.py restore database/backup/backup_20240101_120000.sql
```

Backup requires `pg_dump`; restore requires `psql`. Backups include `campus_circle` and `campus_circle_auth` schemas and data.

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
- Use `python infra/scripts/db.py migrate` to apply migrations to Supabase or local Postgres without opening the SQL editor