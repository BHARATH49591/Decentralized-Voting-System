import mysql.connector
import os

try:
    mydb = mysql.connector.connect(
      host="localhost",
      user="root",
      password="Bharath@60",
      database="voter_db"
    )

    mycursor = mydb.cursor()

    mycursor.execute("SELECT voter_id, otp, otp_expiry FROM voters WHERE otp IS NOT NULL ORDER BY otp_expiry DESC LIMIT 5")

    myresult = mycursor.fetchall()

    if not myresult:
        print("No active OTPs found.")
    else:
        print("\n--- OTP LIST START ---")
        for x in myresult:
            # x[0] = voter_id, x[1] = otp, x[2] = expiry
            print(f"ID: {x[0]} | OTP: {x[1]} | EXP: {x[2]}")
        print("--- OTP LIST END ---\n")

except Exception as e:
    print(f"Error: {e}")
