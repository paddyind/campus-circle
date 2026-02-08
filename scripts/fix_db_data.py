import sys
import os
import time

# Add backend directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '../backend')
sys.path.append(backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(current_dir, '../.env'))

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("psycopg2 not installed. Please install it with: pip install psycopg2-binary")
    sys.exit(1)

# Database connection parameters from environment or defaults
DB_HOST = os.environ.get("SUPABASE_DB_HOST", "db")
DB_PORT = os.environ.get("SUPABASE_DB_PORT", "5432")
DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "postgres")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def execute_query(query, params=None):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if cur.description:
                results = cur.fetchall()
            else:
                results = []
            conn.commit()
            return results
    except Exception as e:
        print(f"Query error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()

def execute_script(filepath):
    conn = get_db_connection()
    if not conn:
        return
    try:
        with open(filepath, 'r') as f:
            sql = f.read()
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            print(f"Executed {filepath}")
    except Exception as e:
        print(f"Error executing script {filepath}: {e}")
        conn.rollback()
    finally:
        conn.close()

def cleanup_duplicates():
    print("Finding duplicate events...")
    # Find titles with more than 1 occurrence
    query = """
        SELECT title, COUNT(*) as count
        FROM campus_circle.events
        GROUP BY title
        HAVING COUNT(*) > 1
    """
    duplicates = execute_query(query)

    if not duplicates:
        print("No duplicate events found.")
    else:
        print(f"Found {len(duplicates)} event titles with duplicates.")

        for dup in duplicates:
            title = dup['title']
            print(f"Cleaning up duplicates for '{title}'...")

            # Get all events with this title
            events_query = """
                SELECT e.id, COUNT(er.id) as reg_count
                FROM campus_circle.events e
                LEFT JOIN campus_circle.event_registrations er ON e.id = er.event_id
                WHERE e.title = %s
                GROUP BY e.id
                ORDER BY reg_count DESC, e.id ASC
            """
            events = execute_query(events_query, (title,))

            if not events:
                continue

            # Keep the first one (most registrations, or lowest ID)
            keep_id = events[0]['id']
            remove_ids = [e['id'] for e in events[1:]]

            if remove_ids:
                print(f"Keeping event {keep_id} (registrations: {events[0]['reg_count']})")
                print(f"Removing events: {remove_ids}")

                for rid in remove_ids:
                    try:
                        # Move registrations
                        conn = get_db_connection()
                        with conn.cursor() as cur:
                            cur.execute("""
                                UPDATE campus_circle.event_registrations
                                SET event_id = %s
                                WHERE event_id = %s
                            """, (keep_id, rid))
                        conn.commit()
                        conn.close()
                    except Exception as e:
                        print(f"Warning: Could not move registrations from {rid}. Error: {e}")

                    try:
                        # Move FAQs
                        conn = get_db_connection()
                        with conn.cursor() as cur:
                            cur.execute("""
                                UPDATE campus_circle.event_faqs
                                SET event_id = %s
                                WHERE event_id = %s
                            """, (keep_id, rid))
                        conn.commit()
                        conn.close()
                    except Exception as e:
                        print(f"Warning: Could not move FAQs from {rid}. Error: {e}")

                    # Delete the event
                    try:
                        conn = get_db_connection()
                        with conn.cursor() as cur:
                            cur.execute("DELETE FROM campus_circle.events WHERE id = %s", (rid,))
                        conn.commit()
                        conn.close()
                    except Exception as e:
                        print(f"Error deleting event {rid}: {e}")

    # Now apply the seed data to update titles to "Demo_" and add new events
    print("Applying updated seed data...")
    seed_file = os.path.join(current_dir, '../database/DML/001_seed_data.sql')
    execute_script(seed_file)
    print("Seed data applied.")

if __name__ == "__main__":
    cleanup_duplicates()
