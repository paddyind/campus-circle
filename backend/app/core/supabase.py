from supabase import create_client, Client
from .config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Use service role key for backend operations (bypasses RLS and email confirmation)
# Fallback to anon key if service role key is not available
supabase_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
supabase: Client = create_client(SUPABASE_URL, supabase_key)

# Expose URL for creating auth clients with different keys
supabase.supabase_url = SUPABASE_URL
