# Supabase Configuration Guide

This document explains how to configure Supabase for the Campus Circle application.

## Required Supabase Credentials

You need the following credentials from your Supabase project:

### 1. Supabase URL
- **Location**: Supabase Dashboard → Settings → API → Project URL
- **Format**: `https://your-project-id.supabase.co`
- **Example**: `https://abcdefghijklmnop.supabase.co`

### 2. Supabase Anon Key
- **Location**: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **Format**: JWT token (starts with `eyJ...`)
- **Usage**: Used by the frontend and backend for public API calls
- **Security**: This key is safe to expose in client-side code (it's public)

### 3. Supabase Service Role Key
- **Location**: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
- **Format**: JWT token (starts with `eyJ...`)
- **Usage**: Used by the backend for admin operations that bypass Row Level Security (RLS)
- **Security**: ⚠️ **KEEP THIS SECRET!** Never expose this in client-side code or commit it to version control

## Setting Up Your Supabase Project

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Campus Circle (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (2-3 minutes)

### Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → Use as `SUPABASE_URL`
   - **Project API keys** → `anon` `public` → Use as `SUPABASE_ANON_KEY`
   - **Project API keys** → `service_role` `secret` → Use as `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Run Database Migrations

The application includes SQL migration files in the `migrations/` directory. You have two options:

#### Option A: Use Local PostgreSQL Container (Recommended for Development)

The `docker-compose.yml` includes a local PostgreSQL container that runs migrations automatically. This is perfect for development and testing.

**No additional setup needed** - migrations run automatically when you start the services.

#### Option B: Run Migrations on Supabase Cloud Database

If you want to use Supabase's cloud database directly:

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the contents of each migration file from `migrations/` directory
3. Run them in order:
   - `001_init_schema.sql`
   - `002_seed_minimal.sql`
   - `003_add_users_table.sql`
   - `004_add_jwt_claim_function.sql`

### Step 4: Configure Environment Variables

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
```

**Important**: 
- Replace all placeholder values with your actual credentials
- Never commit the `.env` file to version control
- The `.env` file is already in `.gitignore`

## Database Schema

The application uses the following schema (defined in `migrations/001_init_schema.sql`):

- **campus_circle.parents** - Parent user accounts
- **campus_circle.schools** - School information
- **campus_circle.classes** - Class/grade information
- **campus_circle.students** - Student accounts
- **campus_circle.parent_students** - Parent-student relationships
- **campus_circle.events** - Event information
- **campus_circle.event_registrations** - Event registrations
- **campus_circle.event_updates** - Event updates/announcements
- **campus_circle.event_faqs** - Event FAQs
- **campus_circle.event_questions** - Parent questions about events
- **campus_circle.documents** - Student documents
- **campus_circle.audit_logs** - Audit trail

## Authentication Setup

The application uses Supabase Auth for authentication. The backend validates JWT tokens from Supabase.

### JWT Configuration

The backend middleware (`app/auth/middleware.py`) validates JWT tokens by:
1. Fetching the JWKS (JSON Web Key Set) from Supabase
2. Verifying the token signature using the public key
3. Validating the token claims

No additional configuration needed - this works automatically with your Supabase project.

## Row Level Security (RLS)

If you're using Supabase's cloud database, you may need to configure Row Level Security policies. However, for development with the local PostgreSQL container, RLS is not enforced.

For production, consider adding RLS policies to:
- Restrict access to parent data (parents can only see their own data)
- Restrict access to student data (parents can only see their children's data)
- Restrict access to events (based on school membership)

## Testing Your Configuration

After setting up your `.env` file, test the configuration:

```bash
# Validate Docker Compose configuration
./scripts/docker-manage.sh validate

# Start all services
./scripts/docker-manage.sh start

# Check backend logs to verify Supabase connection
./scripts/docker-manage.sh logs backend

# Test the API
curl http://localhost:8000/
curl http://localhost:8000/docs  # FastAPI Swagger UI
```

## Troubleshooting

### Error: "Invalid API key"
- Verify your `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Make sure there are no extra spaces or quotes in your `.env` file

### Error: "Connection refused" or "Cannot connect to database"
- If using local PostgreSQL: Check that the `db` service is running (`./scripts/docker-manage.sh status`)
- If using Supabase cloud: Verify your `SUPABASE_URL` is correct

### Error: "Table does not exist"
- Run the migrations (they should run automatically with the local PostgreSQL container)
- If using Supabase cloud, manually run the migration SQL files in the SQL Editor

### JWT Validation Errors
- Verify your `SUPABASE_URL` is correct
- Check that the JWKS endpoint is accessible: `https://your-project-id.supabase.co/auth/v1/.well-known/jwks.json`

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Rotate keys regularly** - Especially the service role key
3. **Use environment-specific keys** - Different keys for development, staging, and production
4. **Restrict service role key usage** - Only use it in backend services, never in frontend
5. **Enable RLS in production** - Add Row Level Security policies for production use

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase API Reference](https://supabase.com/docs/reference)

