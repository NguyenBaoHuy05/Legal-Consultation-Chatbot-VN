import os
from dotenv import load_dotenv
import sys
import resend

print("Checking environment...")

# Try to load .env
load_dotenv()

# Check RESEND_API_KEY
api_key = os.getenv("RESEND_API_KEY")
if api_key:
    print(f"RESEND_API_KEY is set: {api_key[:5]}...{api_key[-5:]}")
else:
    print("RESEND_API_KEY is NOT set.")
    sys.exit(1)

resend.api_key = api_key

# Try to send a test email
print("Attempting to send test email to delivered@resend.dev...")
try:
    r = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": "delivered@resend.dev",
        "subject": "Test Email from Legal Chatbot Debugger",
        "html": "<p>This is a test email to verify Resend configuration.</p>"
    })
    print(f"Success! Email sent. Response: {r}")
except Exception as e:
    print(f"Failed to send email. Error: {e}")
