import pytest
from fastapi.testclient import TestClient
from main import app, db
import os
from unittest.mock import MagicMock, patch

client = TestClient(app)

# Mock DB and other dependencies
# Since we are using Motor (Async), mocking is a bit complex for TestClient which is sync by default unless using AsyncClient.
# However, for a quick verification script without spinning up a real DB, we might need to mock the DB calls in main.py.
# Or we can just rely on the user to run the server and manual verification.

# Let's try to create a script that the user can run which uses the REAL app but maybe we can patch the DB or just use a separate test DB.
# Given the constraints, I will provide a script that uses `requests` to hit the LOCALHOST server, assuming the user is running it.
# This is often more practical for the user than setting up a full pytest async environment if they haven't already.

import requests
import sys

BASE_URL = "http://localhost:8000"

def test_flow():
    # 1. Register a new user
    username = f"test_user_{os.urandom(4).hex()}"
    password = "password123"
    email = f"{username}@example.com"
    
    print(f"Registering {username}...")
    res = requests.post(f"{BASE_URL}/register", json={
        "username": username,
        "password": password,
        "email": email,
        "full_name": "Test User"
    })
    if res.status_code != 200:
        print(f"Registration failed: {res.text}")
        return
    
    # 2. Login
    print("Logging in...")
    res = requests.post(f"{BASE_URL}/token", data={
        "username": username,
        "password": password
    })
    # Note: Registration might require email verification. 
    # If the backend enforces it, we might get 400 here.
    # In main.py: if not user.is_verified: raise HTTPException...
    # We need to manually verify or mock it.
    # Since we can't easily check email, we might need to use an existing admin user or disable verification for test.
    
    if res.status_code == 400 and "Email not verified" in res.text:
        print("User needs verification. Cannot proceed with automated test without DB access to get token.")
        print("Please manually verify the user in DB or use an existing user.")
        return

    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Check Profile (Should be Free)
    res = requests.get(f"{BASE_URL}/users/me", headers=headers)
    user = res.json()
    print(f"User Plan: {user.get('subscription_type', 'unknown')}")
    
    # 4. Chat (1st attempt - Should succeed if system key is set)
    print("Sending 1st message...")
    res = requests.post(f"{BASE_URL}/chat", json={"message": "Hello", "session_id": "test_session"}, headers=headers)
    if res.status_code == 200:
        print("1st message success.")
    else:
        print(f"1st message failed: {res.status_code} - {res.text}")
        
    # 5. Chat (2nd to 5th attempt - Should succeed for Free up to 5)
    print("Sending messages 2 to 5...")
    for i in range(2, 6):
        res = requests.post(f"{BASE_URL}/chat", json={"message": f"Hello {i}", "session_id": "test_session"}, headers=headers)
        if res.status_code != 200:
             print(f"Message {i} failed unexpectedly: {res.status_code}")
             return
    
    # 6. Chat (6th attempt - Should fail)
    print("Sending 6th message...")
    res = requests.post(f"{BASE_URL}/chat", json={"message": "Hello 6", "session_id": "test_session"}, headers=headers)
    if res.status_code == 402:
        print("6th message failed as expected (Limit reached).")
    else:
        print(f"Unexpected status for 6th message: {res.status_code} - {res.text}")
        
    # 6. Upgrade
    print("Upgrading to Premium...")
    requests.post(f"{BASE_URL}/users/me/upgrade", headers=headers)
    
    # 7. Chat (3rd attempt - Should succeed)
    print("Sending 3rd message (Premium)...")
    res = requests.post(f"{BASE_URL}/chat", json={"message": "Hello premium", "session_id": "test_session"}, headers=headers)
    if res.status_code == 200:
        print("3rd message success.")
    else:
        print(f"3rd message failed: {res.status_code} - {res.text}")

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"Test failed with error: {e}")
        print("Ensure the backend server is running on localhost:8000")
