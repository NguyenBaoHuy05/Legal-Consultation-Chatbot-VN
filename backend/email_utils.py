import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# Gmail Configuration
EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465

def send_email(to_email: str, subject: str, html_content: str):
    if not EMAIL_FROM or not EMAIL_PASSWORD:
        print("EMAIL_FROM or EMAIL_PASSWORD not set. Skipping email sending.")
        raise Exception("EMAIL_FROM or EMAIL_PASSWORD is not set in environment variables.")

    msg = MIMEMultipart()
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(EMAIL_FROM, EMAIL_PASSWORD)
            server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise Exception(f"Failed to send email: {str(e)}")

def send_verification_email(to_email: str, token: str):
    verify_link = f"http://localhost:3000/verify-email?token={token}"
    
    html_content = f"""
    <h1 style="text-align: center;">Chào mừng bạn đến với Trợ Lý Pháp Luật</h1>
    <p style="text-align: center;">Vui lòng click vào link bên dưới để xác thực tài khoản của bạn:</p>
    <a href="{verify_link}" style = "flex justify-content: center; align-items: center; text-align: center;background-color: #4CAF50;color: white;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;">Link</a>
    <p style="text-align: center;">Link này sẽ hết hạn sau 24 giờ.</p>
    """
    
    return send_email(to_email, "Xác thực tài khoản - Trợ Lý Pháp Luật", html_content)

def send_password_reset_email(to_email: str, token: str):
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    html_content = f"""
    <h1 style="text-align: center;">Yêu cầu đặt lại mật khẩu</h1>
    <p style="text-align: center;">Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link bên dưới:</p>
    <a href="{reset_link}" style = "flex justify-content: center; align-items: center; text-align: center;background-color: #4CAF50;color: white;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;">Link</a>
    <p style="text-align: center;">Link này sẽ hết hạn sau 1 giờ.</p>
    <p style="text-align: center;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    """
    
    return send_email(to_email, "Đặt lại mật khẩu - Trợ Lý Pháp Luật", html_content)
