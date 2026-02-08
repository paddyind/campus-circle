import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from app.core.config import (
    SUPABASE_DB_HOST,
    SUPABASE_DB_PORT,
    SUPABASE_DB_NAME,
    SUPABASE_DB_USER,
    SUPABASE_DB_PASSWORD,
    SUPABASE_DB_SSLMODE,
)

# Database connection: entirely from env. No host resolution or infra logic in app.
DB_CONFIG = {
    "host": (SUPABASE_DB_HOST or "db").strip(),
    "port": int(SUPABASE_DB_PORT or 5432),
    "database": SUPABASE_DB_NAME or "postgres",
    "user": SUPABASE_DB_USER or "postgres",
    "password": SUPABASE_DB_PASSWORD or "postgres",
}
if SUPABASE_DB_SSLMODE:
    DB_CONFIG["sslmode"] = SUPABASE_DB_SSLMODE.strip()

@contextmanager
def get_db_connection():
    """Get a database connection with automatic cleanup"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        yield conn
    finally:
        if conn:
            conn.close()

def execute_query(query, params=None):
    """Execute a query and return results as list of dicts"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if cur.description:
                results = cur.fetchall()
                conn.commit()
                return results
            conn.commit()
            return []

def execute_query_one(query, params=None):
    """Execute a query and return single result as dict"""
    results = execute_query(query, params)
    return results[0] if results else None
