import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in backend.env")

# Connect to PostgreSQL
try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Step 1: Test connection
    cursor.execute("SELECT version();")
    print("Connected to:", cursor.fetchone()[0])

    # Step 2: Create tables

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Books table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC,
        author_id INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Posts / Feed table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        author_id INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Step 3: Commit changes
    conn.commit()
    print("Tables created successfully.")

    # Step 4: Optional - insert a test user
    cursor.execute("""
    INSERT INTO users (email, password, name) 
    VALUES (%s, %s, %s)
    ON CONFLICT (email) DO NOTHING
    """, ("test@example.com", "testpass", "Test User"))

    conn.commit()
    print("Test user inserted.")

    # Step 5: Optional - query test
    cursor.execute("SELECT * FROM users;")
    for row in cursor.fetchall():
        print(row)

    # Close cursor and connection
    cursor.close()
    conn.close()
    print("Connection closed.")

except Exception as e:
    print(f"Error: {e}")
