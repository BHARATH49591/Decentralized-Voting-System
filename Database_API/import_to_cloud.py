import mysql.connector
import os
import sys

def import_schema():
    print("--- Cloud Database Import Tool ---")
    
    # Get credentials from user
    host = input("Enter MYSQLHOST: ").strip()
    port = input("Enter MYSQLPORT: ").strip()
    user = input("Enter MYSQLUSER: ").strip()
    password = input("Enter MYSQLPASSWORD: ").strip()
    db_name = input("Enter Database Name (should be 'railway' or similar): ").strip()

    try:
        print(f"\nConnecting to {host}...")
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db_name
        )
        cursor = conn.cursor()
        
        # Read schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r') as f:
            sql_commands = f.read().split(';')

        print("Executing schema...")
        for command in sql_commands:
            if command.strip():
                try:
                    cursor.execute(command)
                except Exception as e:
                    print(f"Warning: {e}")
        
        conn.commit()
        print("\nSUCCESS! Your cloud database is now set up with the correct tables.")
        
        # Close connection
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\nERROR: {e}")
        print("\nMake sure 'Public Networking' is enabled in your Railway MySQL settings.")

if __name__ == "__main__":
    import_schema()
