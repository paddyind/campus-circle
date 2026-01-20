# Campus Circle - Scripts Documentation

This directory contains utility scripts for managing the Campus Circle application, including database setup, user management, backups, and Docker operations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Scripts Overview](#scripts-overview)
- [User Setup Scripts](#user-setup-scripts)
  - [setup-admin.sh](#setup-adminsh)
  - [setup-test-users.sh](#setup-test-userssh)
- [Database Management Scripts](#database-management-scripts)
  - [backup-db.sh](#backup-dbsh)
  - [restore-db.sh](#restore-dbsh)
- [Docker Management Script](#docker-management-script)
  - [docker-manage.sh](#docker-managesh)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Prerequisites

Before running any scripts, ensure you have:

1. **Environment Variables**: A `.env` file in the project root with the following variables:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_DB_HOST=your-db-host
   SUPABASE_DB_PORT=5432
   SUPABASE_DB_NAME=postgres
   SUPABASE_DB_USER=postgres
   SUPABASE_DB_PASSWORD=your-db-password
   
   # Optional: Use real email addresses to prevent bounce issues
   TEST_PARENT_EMAIL=your-real-email@example.com
   TEST_STUDENT_EMAIL=your-real-email@example.com
   ```

2. **Email Bounce Prevention** (Important!):
   - Supabase may send confirmation emails even when using Admin API
   - To prevent email bounces, use real email addresses by setting `TEST_PARENT_EMAIL` and `TEST_STUDENT_EMAIL`
   - Scripts use `auto_confirm: true` to minimize email sending, but real addresses are recommended
   - See [Email Bounce Prevention](#email-bounce-prevention) section for details

2. **Docker**: Docker and Docker Compose installed and running

3. **PostgreSQL Client Tools** (for backup/restore):
   - `pg_dump` and `psql` commands available
   - Install via: `brew install postgresql` (macOS) or `apt-get install postgresql-client` (Linux)

4. **Backend Container**: The backend container should be running (scripts will attempt to start it automatically)

---

## Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-admin.sh` | Creates admin user, manages email confirmation | One-time setup, development configuration |
| `setup-test-users.sh` | Creates test users (parent, student) | Development/testing, after database migrations |
| `backup-db.sh` | Backs up database schemas and data | Before major changes, regular backups |
| `restore-db.sh` | Restores database from backup | After data loss, testing restore procedures |
| `docker-manage.sh` | Manages Docker containers | Starting/stopping services, viewing logs |

---

## User Setup Scripts

### setup-admin.sh

Creates the admin user for Campus Circle. This is a **one-time setup** script that should be run after initial database migrations.

**Usage:**
```bash
# Create admin user
./scripts/setup-admin.sh

# Show instructions to disable email confirmation (development)
./scripts/setup-admin.sh --disable-email-confirmation
```

**What it does:**
1. Checks if backend container is running (starts it if needed)
2. **Verifies database schema exists** (checks for `campus_circle.users` table)
3. Creates admin user in Supabase Auth: `admin@campuscircle.com`
4. Sets password: `password123`
5. Confirms email automatically
6. Inserts user into `campus_circle.users` with `admin` role
7. Creates profile in `campus_circle.parents` table

**⚠️ Important**: This script requires migrations to be run first. If you see "Database schema not found" error, run:
```bash
./scripts/docker-manage.sh migrate
```

**Admin Credentials:**
- **Email**: `admin@campuscircle.com`
- **Password**: `password123`
- **Role**: `admin`

**Features:**
- Automatically deletes and recreates admin user if it already exists (ensures fresh setup)
- Handles email confirmation automatically
- Verifies user creation in both Supabase Auth and local database
- Provides detailed logging for troubleshooting
- Includes email confirmation management option

**Email Confirmation Management:**
- Run with `--disable-email-confirmation` flag to get instructions for disabling email confirmation in Supabase Dashboard
- Recommended for development to prevent email bounce issues
- Should be enabled for production

**Troubleshooting:**
- If script fails, check that backend container is running: `docker ps | grep backend`
- Verify Supabase credentials in `.env` file
- Check backend logs: `./scripts/docker-manage.sh logs backend`

---

### setup-test-users.sh

Creates test users (parent and student) for development and testing purposes.

**Usage:**
```bash
./scripts/setup-test-users.sh
```

**What it does:**
1. Checks if backend container is running (starts it if needed)
2. **Verifies database schema exists** (checks for `campus_circle.users` table)
3. Creates two test users in Supabase Auth:
   - **Parent**: `parent@campuscircle.com` (role: `parent`)
   - **Student**: `student@campuscircle.com` (role: `student`)
4. Confirms emails automatically
5. Inserts users into `campus_circle.users` with correct roles
6. Creates profiles in appropriate tables (`parents` or `students`)

**⚠️ Important**: This script requires migrations to be run first. If you see "Database schema not found" error, run:
```bash
./scripts/docker-manage.sh migrate
```

**Test User Credentials:**

**Parent:**
- **Email**: `parent@campuscircle.com`
- **Password**: `password123`
- **Role**: `parent`
- **Full Name**: John Doe
- **Phone**: 123-456-7890

**Student:**
- **Email**: `student@campuscircle.com`
- **Password**: `password123`
- **Role**: `student`
- **Full Name**: Jane Doe
- **DOB**: 2010-05-15

**Features:**
- Automatically updates roles if users already exist (fixes incorrect role assignments)
- Handles email confirmation automatically
- Updates profile information if users already exist
- Provides summary of created/updated users

**Important Notes:**
- This script can be run multiple times safely (idempotent)
- It will update roles and profiles if users already exist
- Use this script after database migrations or when resetting test data

**Troubleshooting:**
- If `student@campuscircle.com` is missing, run the script again
- If roles are incorrect, the script will fix them on re-run
- Check backend logs if script fails: `./scripts/docker-manage.sh logs backend`
- If users don't appear in Supabase, check the script output for errors
- Verify environment variables are loaded: `docker exec <backend-container> env | grep SUPABASE`

**Email Bounce Prevention:**
- Scripts use `auto_confirm: true` to prevent email sending
- However, to be safe, use real email addresses:
  ```bash
  # In .env file
  TEST_PARENT_EMAIL=your-real-email@example.com
  TEST_STUDENT_EMAIL=your-real-email@example.com
  ```
- Then re-run the script to use real addresses

---

## Database Management Scripts

### backup-db.sh

Creates a backup of the Campus Circle database, including schemas and data.

**Usage:**
```bash
# Create backup with auto-generated name
./scripts/backup-db.sh

# Create backup with custom name
./scripts/backup-db.sh my-backup-name
```

**What it does:**
1. Creates backup directory: `backups/<backup-name>/`
2. Backs up schema definitions (`campus_circle` and `campus_circle_auth` schemas)
3. Backs up all data from both schemas
4. Attempts to backup `auth.users` (may require service role access)
5. Creates combined backup file: `backup.sql`
6. Generates metadata file: `metadata.json`

**Backup Structure:**
```
backups/
  └── campus_circle_backup_20240101_120000/
      ├── schema.sql          # Schema definitions only
      ├── data.sql            # Data only
      ├── backup.sql          # Combined schema + data
      ├── auth_users.sql      # Auth users (if accessible)
      └── metadata.json       # Backup metadata
```

**Backup Location:**
- Default: `backups/campus_circle_backup_<timestamp>/`
- Custom: `backups/<backup-name>/`

**Restore from Backup:**
```bash
./scripts/restore-db.sh <backup-name>
```

**Important Notes:**
- Backups include only `campus_circle` and `campus_circle_auth` schemas
- `auth.users` backup may not be available (Supabase manages this separately)
- After restore, run `setup-admin.sh` and `setup-test-users.sh` to recreate users
- Backups are stored locally in the `backups/` directory

**Troubleshooting:**
- If `pg_dump` is not found, install PostgreSQL client tools
- Verify database credentials in `.env` file
- Check database connectivity: `psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME`

---

### restore-db.sh

Restores the Campus Circle database from a backup.

**Usage:**
```bash
./scripts/restore-db.sh <backup-name>
```

**Example:**
```bash
# List available backups
ls backups/

# Restore specific backup
./scripts/restore-db.sh campus_circle_backup_20240101_120000
```

**What it does:**
1. Verifies backup exists and is valid
2. Prompts for confirmation (destructive operation)
3. Drops existing `campus_circle` and `campus_circle_auth` schemas
4. Restores schema definitions
5. Restores all data
6. Attempts to restore `auth.users` (if available)
7. Verifies restoration success

**⚠️ WARNING:**
- This operation is **destructive** and will delete all existing data
- Always backup before restoring
- You will need to recreate users after restore:
  ```bash
  ./scripts/setup-admin.sh
  ./scripts/setup-test-users.sh
  ```

**Post-Restore Steps:**
1. Restore users:
   ```bash
   ./scripts/setup-admin.sh
   ./scripts/setup-test-users.sh
   ```
2. Verify restoration:
   ```bash
   ./scripts/docker-manage.sh logs backend
   ```
3. Test application:
   - Login with test credentials
   - Verify data is restored correctly

**Troubleshooting:**
- If restore fails, check backup files are complete
- Verify database credentials in `.env` file
- Check database connectivity and permissions
- Review restore logs for specific errors

---

## Docker Management Script

### docker-manage.sh

Manages Docker containers for the Campus Circle application.

**Usage:**
```bash
# Start all services
./scripts/docker-manage.sh start

# Start specific service
./scripts/docker-manage.sh start backend
./scripts/docker-manage.sh start frontend

# Stop all services
./scripts/docker-manage.sh stop

# Stop specific service
./scripts/docker-manage.sh stop backend

# View logs
./scripts/docker-manage.sh logs backend
./scripts/docker-manage.sh logs frontend

# View logs (follow mode)
./scripts/docker-manage.sh logs -f backend

# Restart service
./scripts/docker-manage.sh restart backend

# Check status
./scripts/docker-manage.sh status

# Build services
./scripts/docker-manage.sh build

# Remove containers
./scripts/docker-manage.sh down
```

**Available Commands:**
- `start [service]` - Start all services or specific service
- `stop [service]` - Stop all services or specific service
- `restart [service]` - Restart all services or specific service
- `logs [service]` - View logs (add `-f` for follow mode)
- `status` - Show status of all containers
- `build` - Build Docker images
- `down` - Stop and remove containers
- `clean` - Remove containers, volumes, and images

**Services:**
- `backend` - FastAPI backend service
- `frontend` - React frontend service
- `db` - PostgreSQL database (if using local database)

**Examples:**
```bash
# Start everything
./scripts/docker-manage.sh start

# View backend logs
./scripts/docker-manage.sh logs backend

# Restart backend after code changes
./scripts/docker-manage.sh restart backend

# Check what's running
./scripts/docker-manage.sh status
```

---

## Scrap and Recreate (Complete Reset)

Use these workflows when you need to completely reset your development environment or fix persistent issues.

### Complete Reset (Full Environment)

**Use when**: Starting fresh, major issues, or preparing for a clean deployment.

```bash
# 1. Stop all services
./scripts/docker-manage.sh stop

# 2. Remove containers and volumes (WARNING: This deletes all data)
./scripts/docker-manage.sh clean

# 3. Rebuild images
./scripts/docker-manage.sh build

# 4. Start services
./scripts/docker-manage.sh start

# 5. Run migrations
./scripts/docker-manage.sh migrate

# 6. Disable email confirmation (development)
./scripts/setup-admin.sh --disable-email-confirmation

# 7. Create admin user
./scripts/setup-admin.sh

# 8. Create test users
./scripts/setup-test-users.sh
```

### Quick Reset (Keep Database)

**Use when**: You want to keep your database but reset users and roles.

```bash
# 1. Recreate admin user (deletes and recreates)
./scripts/setup-admin.sh

# 2. Recreate test users (updates existing or creates new)
./scripts/setup-test-users.sh
```

### Reset Database Only

**Use when**: You want to reset the database but keep Docker setup.

```bash
# 1. Create a backup first (optional but recommended)
./scripts/backup-db.sh before-reset-$(date +%Y%m%d)

# 2. Stop services
./scripts/docker-manage.sh stop

# 3. Restore from backup or drop/recreate database
# Option A: Restore from backup
./scripts/restore-db.sh <backup-name>

# Option B: If using local PostgreSQL, drop and recreate
# (Manual step - connect to database and drop schemas)

# 4. Run migrations
./scripts/docker-manage.sh migrate

# 5. Recreate users
./scripts/setup-admin.sh
./scripts/setup-test-users.sh
```

### Reset Users Only

**Use when**: User roles are incorrect or users are missing.

```bash
# Recreate admin (will delete and recreate)
./scripts/setup-admin.sh

# Recreate test users (will update roles and profiles)
./scripts/setup-test-users.sh
```

### Fix Specific Issues

**User roles incorrect:**
```bash
./scripts/setup-admin.sh      # Fixes admin role
./scripts/setup-test-users.sh # Fixes parent/student roles
```

**Missing users:**
```bash
./scripts/setup-admin.sh      # Creates admin if missing
./scripts/setup-test-users.sh # Creates parent/student if missing
```

**Email confirmation issues:**
```bash
./scripts/setup-admin.sh --disable-email-confirmation
```

---

## Email Bounce Prevention

Supabase may send transactional emails even when using the Admin API. To prevent email bounces:

**Quick Setup:**
```bash
./scripts/setup-admin.sh --disable-email-confirmation
```

This will guide you through disabling email confirmation in Supabase Dashboard.

**Alternative Options:**

### Option 1: Use Real Email Addresses (Recommended)

Set these in your `.env` file:
```bash
TEST_PARENT_EMAIL=your-real-email@example.com
TEST_STUDENT_EMAIL=your-real-email@example.com
```

Then re-run the setup scripts. The scripts will use these addresses instead of the default fake ones.

### Option 2: Disable Email Confirmations in Supabase

1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Enable email confirmations"
3. Disable it for development/testing
4. Re-enable for production

### Option 3: Use Custom SMTP Provider

Set up a custom SMTP provider in Supabase Dashboard → Settings → Auth → SMTP Settings. This gives you better control over email delivery.

### What Scripts Do

All setup scripts use:
- `email_confirm: True` - Confirms email immediately
- `auto_confirm: True` - Prevents email from being sent

However, some Supabase configurations may still send emails. Using real email addresses is the safest approach.

---

## Troubleshooting

### Common Issues

#### 1. "Database schema not found" or "relation 'campus_circle.users' does not exist"
**Solution:**
```bash
# Run migrations first
./scripts/docker-manage.sh migrate

# Then create users
./scripts/setup-admin.sh
./scripts/setup-test-users.sh
```

**Note**: Migrations must be run before creating users. The setup scripts now verify the schema exists and will show this error if migrations haven't been run.

#### 2. "Backend container is not running"
**Solution:**
```bash
# Start backend container
./scripts/docker-manage.sh start backend

# Or start all services
./scripts/docker-manage.sh start
```

#### 3. "Invalid login credentials" for test users
**Solution:**
```bash
# Recreate test users
./scripts/setup-test-users.sh

# Verify users exist in Supabase Dashboard
# Check backend logs for errors
./scripts/docker-manage.sh logs backend
```

#### 4. "User role is incorrect" (e.g., parent has student role)
**Solution:**
```bash
# Re-run setup script (it will fix roles)
./scripts/setup-test-users.sh

# For admin, re-run:
./scripts/setup-admin.sh
```

#### 5. "Email not confirmed" error
**Solution:**
- Setup scripts automatically confirm emails with `auto_confirm: true`
- If issue persists, check Supabase Dashboard → Authentication → Settings
- Disable "Enable email confirmations" for development
- Verify user exists in Supabase Dashboard → Authentication → Users

#### 6. "User not found in Supabase" (e.g., student@campuscircle.com missing)
**Solution:**
- Re-run the setup script: `./scripts/setup-test-users.sh`
- Check script output for errors
- Verify backend container is running: `docker ps | grep backend`
- Check Supabase Dashboard → Authentication → Users manually
- Review backend logs: `./scripts/docker-manage.sh logs backend`

#### 7. Email bounce warnings from Supabase
**Solution:**
- Use real email addresses (see [Email Bounce Prevention](#email-bounce-prevention))
- Set `TEST_PARENT_EMAIL` and `TEST_STUDENT_EMAIL` in `.env`
- Re-run setup scripts to use real addresses
- Consider disabling email confirmations for development

#### 8. "pg_dump/psql not found"
**Solution:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Verify installation
which pg_dump
which psql
```

#### 9. Database connection errors
**Solution:**
- Verify `.env` file has correct database credentials
- Check database is accessible: `psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME`
- Verify network connectivity to Supabase

---

## Best Practices

### User Management

1. **Initial Setup:**
   ```bash
   # 1. Run migrations (if needed)
   ./scripts/docker-manage.sh migrate
   
   # 2. Disable email confirmation (development only)
   ./scripts/setup-admin.sh --disable-email-confirmation
   
   # 3. Create admin user
   ./scripts/setup-admin.sh
   
   # 4. Create test users
   ./scripts/setup-test-users.sh
   ```

2. **After Database Restore:**
   ```bash
   # Always recreate users after restore
   ./scripts/setup-admin.sh
   ./scripts/setup-test-users.sh
   ```

3. **Role Corrections:**
   - If roles are incorrect, simply re-run the setup scripts
   - Scripts are idempotent and will fix existing users

### Database Backups

1. **Regular Backups:**
   ```bash
   # Create daily backups
   ./scripts/backup-db.sh daily-$(date +%Y%m%d)
   ```

2. **Before Major Changes:**
   ```bash
   # Always backup before migrations or major updates
   ./scripts/backup-db.sh pre-migration-$(date +%Y%m%d)
   ```

3. **Backup Retention:**
   - Keep at least 7 days of daily backups
   - Keep backups before major releases indefinitely
   - Store backups in version control or cloud storage

### Development Workflow

1. **Starting Development:**
   ```bash
   # Start services
   ./scripts/docker-manage.sh start
   
   # Create test users
   ./scripts/setup-test-users.sh
   ```

2. **After Code Changes:**
   ```bash
   # Restart affected service
   ./scripts/docker-manage.sh restart backend
   ```

3. **Debugging:**
   ```bash
   # View logs
   ./scripts/docker-manage.sh logs backend -f
   ```

### Production Considerations

1. **Remove Test Credentials:**
   - Set `REACT_APP_SHOW_TEST_CREDENTIALS=false` in production
   - Remove or disable test user creation scripts

2. **Secure Admin Access:**
   - Change default admin password immediately
   - Use strong passwords
   - Enable 2FA if available

3. **Backup Strategy:**
   - Automated daily backups
   - Off-site backup storage
   - Test restore procedures regularly

---

## Script Dependencies

All scripts depend on:
- `.env` file with Supabase credentials
- Docker and Docker Compose
- Backend container (scripts will attempt to start it)
- PostgreSQL client tools (for backup/restore scripts)

---

## Support

For issues or questions:
1. Check this documentation
2. Review script logs and error messages
3. Check backend logs: `./scripts/docker-manage.sh logs backend`
4. Verify environment variables in `.env` file
5. Check Supabase Dashboard for user/auth issues

---

**Last Updated:** 2024-01-01
**Version:** 1.0
