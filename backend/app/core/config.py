import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Database connection (all from env; no infra logic in app)
SUPABASE_DB_HOST = os.environ.get("SUPABASE_DB_HOST", "db")
SUPABASE_DB_PORT = os.environ.get("SUPABASE_DB_PORT", "5432")
SUPABASE_DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
SUPABASE_DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "postgres")
# Optional. Set to "require" for Supabase (direct or pooler). Leave unset for local Postgres.
SUPABASE_DB_SSLMODE = os.environ.get("SUPABASE_DB_SSLMODE", "").strip() or None

# Email confirmation setting (for development, set to False to disable email confirmation requirement)
# In production, this should be True and email confirmation should be enabled in Supabase Dashboard
ENABLE_EMAIL_CONFIRMATION = os.environ.get("ENABLE_EMAIL_CONFIRMATION", "false").lower() == "true"

# Optional: restrict registration to specific email domains (e.g. your school or tenant domain).
# Comma-separated list, e.g. "campuscircle.com" or "school.edu,campuscircle.com". Empty = allow any domain.
ALLOWED_EMAIL_DOMAINS = os.environ.get("ALLOWED_EMAIL_DOMAINS", "").strip()
if ALLOWED_EMAIL_DOMAINS:
    ALLOWED_EMAIL_DOMAINS = [d.strip().lower() for d in ALLOWED_EMAIL_DOMAINS.split(",") if d.strip()]
else:
    ALLOWED_EMAIL_DOMAINS = []

# Local storage for event resources (tenant/event-scoped). Use absolute or relative path.
# Default: ./storage in project root. For Docker, use a volume mount, e.g. /app/storage.
STORAGE_BASE_PATH = os.environ.get("STORAGE_BASE_PATH", "").strip() or None
