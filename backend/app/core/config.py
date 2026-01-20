import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Database connection for direct PostgreSQL access
SUPABASE_DB_HOST = os.environ.get("SUPABASE_DB_HOST", "db")
SUPABASE_DB_PORT = os.environ.get("SUPABASE_DB_PORT", "5432")
SUPABASE_DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
SUPABASE_DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "postgres")

# Email confirmation setting (for development, set to False to disable email confirmation requirement)
# In production, this should be True and email confirmation should be enabled in Supabase Dashboard
ENABLE_EMAIL_CONFIRMATION = os.environ.get("ENABLE_EMAIL_CONFIRMATION", "false").lower() == "true"
