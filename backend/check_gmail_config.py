import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

print("Checking Gmail configuration...")

# Try to load .env
load_dotenv()

EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465

if not EMAIL_FROM:
    print("Error: EMAIL_FROM is not set in .env")
else:
    print(f"EMAIL_FROM is set: {EMAIL_FROM}")

if not EMAIL_PASSWORD:
    print("Error: EMAIL_PASSWORD is not set in .env")
else:
    print("EMAIL_PASSWORD is set.")

if not EMAIL_FROM or not EMAIL_PASSWORD:
    print("Please update your .env file with EMAIL_FROM and EMAIL_PASSWORD.")
    exit(1)

print(f"Attempting to send test email to {EMAIL_FROM}...")

msg = MIMEMultipart()
msg["From"] = EMAIL_FROM
msg["To"] = EMAIL_FROM
msg["Subject"] = "Test Email from Legal Chatbot (Gmail)"
msg.attach(MIMEText("<p>This is a test email to verify Gmail SMTP configuration.</p>", "html"))

try:
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
        server.login(EMAIL_FROM, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, EMAIL_FROM, msg.as_string())
    print("Success! Test email sent.")
except Exception as e:
    print(f"Failed to send email: {e}")
    print("Tip: Make sure you are using an App Password, not your login password.")
