import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        cnx = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST"),
            user=os.getenv("MYSQL_USER"),
            password=os.getenv("MYSQL_PASSWORD"),
            database=os.getenv("MYSQL_DB")
        )
        cursor = cnx.cursor()
        
        print("Adding email, otp, and otp_expiry columns to voters table...")
        
        # Check if columns already exist to avoid errors
        cursor.execute("SHOW COLUMNS FROM voters LIKE 'email'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE voters ADD COLUMN email VARCHAR(255)")
            print("Added email column.")
        
        cursor.execute("SHOW COLUMNS FROM voters LIKE 'otp'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE voters ADD COLUMN otp VARCHAR(6)")
            print("Added otp column.")
            
        cursor.execute("SHOW COLUMNS FROM voters LIKE 'otp_expiry'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE voters ADD COLUMN otp_expiry DATETIME")
            print("Added otp_expiry column.")
            
        cnx.commit()
        print("Migration completed successfully.")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

if __name__ == "__main__":
    migrate()
