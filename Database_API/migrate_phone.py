import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        cnx = mysql.connector.connect(
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            host=os.getenv("MYSQL_HOST", "127.0.0.1"),
            database=os.getenv("MYSQL_DB", "voter_db")
        )
        cursor = cnx.cursor()
        
        # Check if column exists
        cursor.execute("SHOW COLUMNS FROM voters LIKE 'phone'")
        result = cursor.fetchone()
        
        if not result:
            print("Adding 'phone' column to 'voters' table...")
            cursor.execute("ALTER TABLE voters ADD COLUMN phone VARCHAR(20) AFTER email")
            cnx.commit()
            print("Migration successful.")
        else:
            print("'phone' column already exists.")
            
        cursor.close()
        cnx.close()
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
