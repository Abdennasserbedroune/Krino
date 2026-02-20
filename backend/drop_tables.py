import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend.env")

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Drop users table and cascade to dependents
    print("Dropping table 'users' and dependents...")
    cursor.execute("DROP TABLE IF EXISTS users CASCADE;")
    
    # Also drop other tables created by db.py just in case
    cursor.execute("DROP TABLE IF EXISTS books CASCADE;")
    cursor.execute("DROP TABLE IF EXISTS posts CASCADE;")

    conn.commit()
    print("Tables dropped successfully.")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
