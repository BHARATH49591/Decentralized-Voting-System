  # Import required modules
import dotenv
import os
import mysql.connector
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from mysql.connector import errorcode
import jwt
from dotenv import load_dotenv
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
load_dotenv()

# Pydantic models
class RegisterRequest(BaseModel):
    voter_id: str
    password: str
    email: str
    role: str = "user"

class LoginRequest(BaseModel):
    voter_id: str
    password: str

class VerifyOTPRequest(BaseModel):
    voter_id: str
    otp: str

class SendOTPRequest(BaseModel):
    voter_id: str
    method: str = "email" # default to email

class ApprovalRequest(BaseModel):
    voter_id: str
    action: str # 'approve' or 'reject'

class PublishResultsRequest(BaseModel):
    winner_name: str
    winner_id: int


# Loading the environment variables

# Initialize the todoapi app
app = FastAPI()

# Define the allowed origins for CORS


# Add CORS middleware
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to the MySQL database
try:
    cnx = mysql.connector.connect(
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', 'Bharath@60'),
        host=os.environ.get('MYSQL_HOST', '127.0.0.1'),
        database=os.environ.get('MYSQL_DB', 'voter_db'),
        port=int(os.environ.get('MYSQL_PORT', 3306))
    )
    cursor = cnx.cursor()
except mysql.connector.Error as err:
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Something is wrong with your user name or password")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Database does not exist")
    else:
        print(err)

# Define the authentication middleware
async def authenticate(request: Request):
    try:
        api_key = request.headers.get('authorization').replace("Bearer ", "")
        cursor.execute("SELECT * FROM voters WHERE voter_id = %s", (api_key,))
        if api_key not in [row[0] for row in cursor.fetchall()]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Forbidden"
            )
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forbidden"
        )

def send_otp_email(to_email, otp):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or "YOUR_EMAIL" in smtp_user:
        print(f"\n[WARNING] SMTP not configured. Printing OTP to console: {otp}\n")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = "Your Voting System OTP"

        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
                    <h2 style="color: #4CAF50; text-align: center;">Voting System Verification</h2>
                    <p>Hello,</p>
                    <p>Your One-Time Password (OTP) for logging into the Decentralized Voting System is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2196F3; padding: 10px 20px; border: 2px dashed #2196F3; border-radius: 5px;">{otp}</span>
                    </div>
                    <p>This OTP is valid for <b>5 minutes</b>. Please do not share this code with anyone.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777; text-align: center;">This is an automated message, please do not reply.</p>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}")
        return False

# Define the POST endpoint for login
@app.post("/login")
async def login(request: LoginRequest):
    try:
        cursor.execute("SELECT voter_id, role, password, status, email FROM voters WHERE voter_id = %s AND password = %s", (request.voter_id, request.password))
        voter = cursor.fetchone()
        
        if not voter:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Voter ID or Password"
            )

        # Check status
        v_id, role, password, status_val, email = voter
        if role == 'user' and status_val == 'pending':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration pending approval."
            )
        elif role == 'user' and status_val == 'rejected':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration rejected."
            )
            
        # Return success with masked info
        masked_email = email[:3] + "****" + email[email.find("@"):] if email else "N/A"
        
        return {
            "message": "Login successful. Sending OTP to email.",
            "voter_id": request.voter_id,
            "email": masked_email
        }
        
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(status_code=500, detail="Database error")

@app.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    try:
        cursor.execute("SELECT email FROM voters WHERE voter_id = %s", (request.voter_id,))
        voter = cursor.fetchone()
        if not voter:
            raise HTTPException(status_code=404, detail="User not found")
            
        email = voter[0]
        otp = str(random.randint(100000, 999999))
        expiry = datetime.now() + timedelta(minutes=5)
        
        cursor.execute("UPDATE voters SET otp = %s, otp_expiry = %s WHERE voter_id = %s", (otp, expiry, request.voter_id))
        cnx.commit()
        
        # PROMPT: Show OTP in terminal for demonstration
        print(f"\n{'='*40}")
        print(f"DEBUG OTP for {request.voter_id}: {otp}")
        print(f"{'='*40}\n")
        
        email_sent = send_otp_email(email, otp)
        return {
            "message": "OTP sent to your email" if email_sent else f"OTP generated (Demo Mode). Code: {otp}",
            "debug_otp": otp,
            "warning": None if email_sent else "Email failed"
        }
            
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(status_code=500, detail="Database error")
        
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )

@app.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    try:
        cursor.execute("SELECT voter_id, role, otp, otp_expiry FROM voters WHERE voter_id = %s", (request.voter_id,))
        voter = cursor.fetchone()
        
        if not voter:
            raise HTTPException(status_code=404, detail="User not found")
            
        v_id, role, db_otp, expiry = voter
        
        if not db_otp or db_otp != request.otp:
            raise HTTPException(status_code=401, detail="Invalid OTP")
            
        if datetime.now() > expiry:
            raise HTTPException(status_code=401, detail="OTP expired")
            
        # Clear OTP after successful verification
        cursor.execute("UPDATE voters SET otp = NULL, otp_expiry = NULL WHERE voter_id = %s", (request.voter_id,))
        cnx.commit()
        
        # Create JWT token
        token_data = {'voter_id': v_id, 'role': role}
        token = jwt.encode(token_data, os.getenv("SECRET_KEY"), algorithm="HS256")
        
        return {'token': token, 'role': role}
        
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )

@app.post("/register")
async def register(request: RegisterRequest):
    try:
        # Check if voter already exists
        cursor.execute("SELECT * FROM voters WHERE voter_id = %s", (request.voter_id,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter ID already registered"
            )
        
        # Insert new voter with pending status
        query = "INSERT INTO voters (voter_id, password, email, role, status) VALUES (%s, %s, %s, %s, %s)"
        values = (request.voter_id, request.password, request.email, request.role, 'pending')
        cursor.execute(query, values)
        cnx.commit()
        
        return {"message": "Registration successful. Please wait for admin approval."}
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )

# Replace 'admin' with the actual role based on authentication
async def get_role(voter_id, password):
    try:
        cursor.execute("SELECT role FROM voters WHERE voter_id = %s AND password = %s", (voter_id, password,))
        role = cursor.fetchone()
        if role:
            return role[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter id or password"
            )
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )

# New endpoints for admin voter management
@app.get("/admin/voters/pending")
async def get_pending_voters():
    try:
        cursor.execute("SELECT voter_id, email, role, status FROM voters WHERE status = 'pending'")
        columns = [col[0] for col in cursor.description]
        voters_list = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return voters_list
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(status_code=500, detail="Database error")

@app.post("/admin/voters/approve")
async def approve_voter(request: ApprovalRequest):
    try:
        new_status = 'approved' if request.action == 'approve' else 'rejected'
        cursor.execute("UPDATE voters SET status = %s WHERE voter_id = %s", (new_status, request.voter_id))
        cnx.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Voter not found")
        return {"message": f"Voter {request.voter_id} {new_status} successfully"}
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(status_code=500, detail="Database error")

@app.post("/admin/notify-voters")
async def notify_voters():
    with open("notifier_debug.log", "a") as f:
        try:
            f.write(f"\n--- Notification Triggered at {datetime.now()} ---\n")
            cursor.execute("SELECT email FROM voters WHERE role = 'user' AND LOWER(status) = 'approved'")
            emails = [row[0] for row in cursor.fetchall() if row[0]]
            
            f.write(f"Found {len(emails)} approved voters: {emails}\n")
            
            if not emails:
                f.write("No eligible voters found. Skipping.\n")
                return {"message": "No approved voters with emails found"}

            smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = int(os.getenv("SMTP_PORT", 587))
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")

            if not smtp_user or "YOUR_EMAIL" in smtp_user:
                f.write("SMTP not configured in .env. Skipping.\n")
                return {"message": "SMTP not configured, notifications skipped"}

            sent_count = 0
            for email in emails:
                try:
                    f.write(f"Attempting to notify: {email}\n")
                    msg = MIMEMultipart()
                    msg['From'] = smtp_user
                    msg['To'] = email
                    msg['Subject'] = "🚨 Election Alert: Voting is Now Live!"

                    body = f"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #4CAF50; border-radius: 10px;">
                                <h2 style="color: #4CAF50; text-align: center;">ELECTION LIVE</h2>
                                <p>Hello Voter,</p>
                                <p>The voting period has been officially set! You can now log into the portal and cast your secure ballot on the blockchain.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:8080')}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">GO TO VOTING PORTAL</a>
                                </div>
                                <p>Every vote counts in building a decentralized future.</p>
                            </div>
                        </body>
                    </html>
                    """
                    msg.attach(MIMEText(body, 'html'))

                    with smtplib.SMTP(smtp_server, smtp_port) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                    sent_count += 1
                    f.write(f"Successfully sent to {email}\n")
                except Exception as e:
                    f.write(f"Failed to notify {email}: {str(e)}\n")
                    print(f"Failed to notify {email}: {e}")

            return {"message": f"Successfully notified {sent_count} voters"}
        except Exception as e:
            f.write(f"CRITICAL ERROR: {str(e)}\n")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/publish-results")
async def publish_results(request: PublishResultsRequest):
    with open("notifier_debug.log", "a") as f:
        try:
            f.write(f"\n--- Result Publication Triggered at {datetime.now()} ---\n")
            cursor.execute("SELECT email FROM voters WHERE role = 'user' AND LOWER(status) = 'approved'")
            emails = [row[0] for row in cursor.fetchall() if row[0]]
            
            if not emails:
                return {"message": "No voters to notify"}

            smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = int(os.getenv("SMTP_PORT", 587))
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")

            if not smtp_user or "YOUR_EMAIL" in smtp_user:
                return {"message": "SMTP not configured, emails skipped"}

            sent_count = 0
            for email in emails:
                try:
                    msg = MIMEMultipart()
                    msg['From'] = smtp_user
                    msg['To'] = email
                    msg['Subject'] = "🏆 ELECTION RESULTS ANNOUNCED!"

                    body = f"""
                    <html>
                        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-top: 5px solid #6366F1;">
                                <h1 style="color: #1E293B; text-align: center;">Election Conclusion</h1>
                                <p style="font-size: 1.1rem; color: #475569; text-align: center;">The votes have been officially counted and the election has ended.</p>
                                
                                <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; margin: 30px 0; text-align: center; border: 1px dashed #CBD5E1;">
                                    <h2 style="margin: 0; color: #6366F1;">OFFICIAL WINNER</h2>
                                    <p style="font-size: 2rem; font-weight: bold; margin: 10px 0; color: #1E293B;">{request.winner_name}</p>
                                    <p style="color: #64748B;">Candidate ID: {request.winner_id}</p>
                                </div>

                                <p style="text-align: center; color: #64748B;">You can view the full final results and the blockchain audit trail on the portal.</p>
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:8080')}/audit.html" style="background: #6366F1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: 600;">VIEW PUBLIC AUDIT PORTAL</a>
                                </div>
                                <hr style="margin: 40px 0; border: 0; border-top: 1px solid #E2E8F0;">
                                <p style="font-size: 0.8rem; color: #94A3B8; text-align: center;">This election was powered by decentralized blockchain technology ensuring maximum transparency.</p>
                            </div>
                        </body>
                    </html>
                    """
                    msg.attach(MIMEText(body, 'html'))

                    with smtplib.SMTP(smtp_server, smtp_port) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                    sent_count += 1
                except Exception as e:
                    f.write(f"Failed to notify {email}: {str(e)}\n")

            return {"message": f"Results published and {sent_count} voters notified"}
        except Exception as e:
            f.write(f"CRITICAL ERROR: {str(e)}\n")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/notify-voters")
async def notify_voters():
    # Simulation of voter notification
    # In a real app, this would iterate through a database of voter emails
    print("Triggering voter notifications...")
    return {
        "success": True,
        "message": "Success! Notification emails have been queued for all approved voters."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
