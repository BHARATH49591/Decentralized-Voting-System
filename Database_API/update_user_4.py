import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def update_voter_phone():
    try:
        cnx = mysql.connector.connect(
            user=os.getenv("MYSQL_USER"),
            password=os.getenv("MYSQL_PASSWORD"),
            host=os.getenv("MYSQL_HOST"),
            database=os.getenv("MYSQL_DB")
        )
        cursor = cnx.cursor()
        
        # Try different possible IDs for "user 4"
        possible_ids = ["user-004"]
        
        updated = False
        for vid in possible_ids:
            cursor.execute("SELECT voter_id FROM voters WHERE voter_id = %s", (vid,))
            if cursor.fetchone():
                print(f"Found voter with ID: {vid}. Updating phone to 7893934474...")
                cursor.execute("UPDATE voters SET phone = '7893934474' WHERE voter_id = %s", (vid,))
                cnx.commit()
                print("Update successful.")
                updated = True
                break
        
        if not updated:
            # Try a broader search if not found
            cursor.execute("SELECT voter_id FROM voters WHERE voter_id LIKE '%4%'")
            results = cursor.fetchall()
            if results:
                print(f"Voter 'user 4' not found exactly. Found these similar IDs: {results}")
                print("No update performed. Please specify the exact ID.")
            else:
                print("Voter 'user 4' not found.")
            
        cursor.close()
        cnx.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_voter_phone()
