import os
import resend
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

FROM_EMAIL = "onboarding@resend.dev" # Change this to your verified domain in production

def send_verification_email(to_email: str, token: str):
    if not RESEND_API_KEY:
        print("RESEND_API_KEY not set. Skipping email sending.")
        return False
    
    verify_link = f"http://localhost:3000/verify-email?token={token}"
    
    try:
        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": to_email,
            "subject": "Xác thực tài khoản - Trợ Lý Pháp Luật",
            "html": f"""
            <h1>Chào mừng bạn đến với Trợ Lý Pháp Luật</h1>
            <p>Vui lòng click vào link bên dưới để xác thực tài khoản của bạn:</p>
            <a href="{verify_link}">{verify_link}</a>
            <p>Link này sẽ hết hạn sau 24 giờ.</p>
            """
        })
        print(f"Verification email sent to {to_email}: {r}")
        return True
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return False

def send_password_reset_email(to_email: str, token: str):
    if not RESEND_API_KEY:
        print("RESEND_API_KEY not set. Skipping email sending.")
        return False
    
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    try:
        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": to_email,
            "subject": "Đặt lại mật khẩu - Trợ Lý Pháp Luật",
            "html": f"""
            <h1>Yêu cầu đặt lại mật khẩu</h1>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link bên dưới:</p>
            <a href="{reset_link}">{reset_link}</a>
            <p>Link này sẽ hết hạn sau 1 giờ.</p>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
            """
        })
        print(f"Password reset email sent to {to_email}: {r}")
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False
