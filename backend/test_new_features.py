import asyncio
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import get_current_user

# Create a mock user class
class MockUser:
    def __init__(self, id="f81d4fae-7dec-11d0-a765-00a0c91e6bf6"):
        self.id = id

# Mock authentication dependency
async def mock_get_current_user():
    return MockUser()

app.dependency_overrides[get_current_user] = mock_get_current_user
client = TestClient(app)

class TestNewFeatures(unittest.TestCase):

    def test_health_check(self):
        """Test health check route returns correct NVIDIA LLM config"""
        print("\n--- Testing Health Check End-point ---")
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print("Health Check Response:", data)
        self.assertEqual(data["status"], "healthy")
        self.assertTrue("NVIDIA" in data["ai_agent_engine"])

    @patch("app.routers.notifications.supabase_admin")
    def test_register_push_token(self, mock_supabase_admin):
        """Test registration of Expo push token"""
        print("\n--- Testing Push Token Registration ---")
        # Mock Supabase database response
        mock_execute = MagicMock()
        mock_execute.execute.return_value = MagicMock(data=[])
        mock_supabase_admin.table.return_value.update.return_value.eq.return_value = mock_execute

        response = client.post(
            "/api/notifications/register-token",
            json={"expo_push_token": "ExponentPushToken[mock_token_123]"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print("Registration Response:", data)
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["message"], "Push token registered.")
        
        # Verify Supabase call
        mock_supabase_admin.table.assert_called_with("profiles")
        mock_supabase_admin.table().update.assert_called_with({"expo_push_token": "ExponentPushToken[mock_token_123]"})

    @patch("app.routers.notifications.send_expo_push")
    @patch("app.routers.notifications.supabase_admin")
    def test_send_push_notification(self, mock_supabase_admin, mock_send_expo_push):
        """Test sending push notification via Expo router"""
        print("\n--- Testing Send Notification ---")
        # Mock user profile retrieve from Supabase
        mock_profile_select = MagicMock()
        mock_profile_select.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"expo_push_token": "ExponentPushToken[mock_token_123]"}
        )
        mock_supabase_admin.table.return_value.select.return_value = mock_profile_select

        # Mock push notification post
        mock_send_expo_push.return_value = {"status": "ok", "id": "expo-msg-id"}

        response = client.post(
            "/api/notifications/send",
            json={"title": "Test Title", "body": "Test Body"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print("Send Notification Response:", data)
        self.assertEqual(data["status"], "sent")
        
        # Verify mock send was triggered
        mock_send_expo_push.assert_called_with("ExponentPushToken[mock_token_123]", "Test Title", "Test Body")

if __name__ == "__main__":
    unittest.main()
