
import mysql.connector
import os
from dotenv import load_dotenv

# Try to load from the Database_API/.env
env_path = r"c:\Users\Pradeep\Downloads\Decentralized-Voting-System-main\Decentralized-Voting-System-main\Database_API\.env"
load_dotenv(env_path)

try:
    cnx = mysql.connector.connect(
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', 'Bharath@60'),
        host=os.environ.get('MYSQL_HOST', '127.0.0.1'),
        database=os.environ.get('MYSQL_DB', 'voter_db'),
        port=int(os.environ.get('MYSQL_PORT', 3306))
    )
    cursor = cnx.cursor()
    cursor.execute("SELECT voter_id, role, password FROM voters")
    rows = cursor.fetchall()
    print("Voter ID | Role | Password")
    print("-" * 30)
    for row in rows:
        print(f"{row[0]} | {row[1]} | {row[2]}")
    cnx.close()
except Exception as e:
    print(f"Error: {e}")
