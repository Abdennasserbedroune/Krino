"""Add extracted_cv column to cvs table.

This migration adds the extracted_cv JSON column to store parsed CV data.
Run this script to update your database schema.
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

def migrate():
    """Add extracted_cv column to cvs table."""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='cvs' AND column_name='extracted_cv'
        """))
        
        if result.fetchone():
            print("✓ Column 'extracted_cv' already exists in 'cvs' table")
            return
        
        # Add the column
        print("Adding 'extracted_cv' column to 'cvs' table...")
        conn.execute(text("""
            ALTER TABLE cvs 
            ADD COLUMN extracted_cv JSON
        """))
        conn.commit()
        print("✓ Column 'extracted_cv' added successfully")

if __name__ == "__main__":
    try:
        migrate()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise
