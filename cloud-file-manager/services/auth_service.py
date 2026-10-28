"""
Authentication Service supporting Supabase Auth and Local Development Sessions.

Handles:
- User signup and login with Supabase Auth
- Session management & current user resolution
- Multi-user isolation verification (local demo mode provides switchable profiles)
"""

from typing import Optional, Dict, Any


class AuthService:
    """Manages authentication tokens, sessions, and user IDs."""

    def __init__(self, supabase_client=None, mode: str = "local"):
        self.supabase = supabase_client
        self.mode = mode
        self.current_user: Optional[Dict[str, Any]] = None
        
        # Default demo profile for local college review mode
        if self.mode == "local":
            self.current_user = {
                "id": "demo-user-iot-01",
                "email": "student@college.edu",
                "name": "B.Tech Student (Demo User 1)"
            }

    def sign_up(self, email: str, password: str) -> Dict[str, Any]:
        """Signs up a new user via Supabase Auth or registers in local session."""
        if self.mode == "cloud" and self.supabase:
            try:
                res = self.supabase.auth.sign_up({"email": email, "password": password})
                if res.user:
                    self.current_user = {
                        "id": res.user.id,
                        "email": res.user.email,
                        "session": res.session
                    }
                    return {"success": True, "user": self.current_user}
                return {"success": False, "error": "Check verification email if required."}
            except Exception as e:
                return {"success": False, "error": str(e)}
        else:
            user_id = f"user-{abs(hash(email)) % 1000000:06d}"
            self.current_user = {
                "id": user_id,
                "email": email,
                "name": email.split("@")[0]
            }
            return {"success": True, "user": self.current_user}

    def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticates user with email and password."""
        if self.mode == "cloud" and self.supabase:
            try:
                res = self.supabase.auth.sign_in_with_password({"email": email, "password": password})
                if res.user:
                    self.current_user = {
                        "id": res.user.id,
                        "email": res.user.email,
                        "session": res.session
                    }
                    return {"success": True, "user": self.current_user}
                return {"success": False, "error": "Invalid credentials"}
            except Exception as e:
                return {"success": False, "error": str(e)}
        else:
            user_id = f"user-{abs(hash(email)) % 1000000:06d}"
            self.current_user = {
                "id": user_id,
                "email": email,
                "name": email.split("@")[0]
            }
            return {"success": True, "user": self.current_user}

    def sign_out(self):
        """Terminates active session."""
        if self.mode == "cloud" and self.supabase:
            try:
                self.supabase.auth.sign_out()
            except Exception:
                pass
        self.current_user = None

    def get_current_user(self) -> Optional[Dict[str, Any]]:
        return self.current_user

    def switch_demo_user(self, user_num: int):
        """Allows switching between demo users in local mode to demonstrate user isolation."""
        if self.mode == "local":
            if user_num == 1:
                self.current_user = {
                    "id": "demo-user-iot-01",
                    "email": "student1@college.edu",
                    "name": "B.Tech Student 1"
                }
            else:
                self.current_user = {
                    "id": "demo-user-iot-02",
                    "email": "student2@college.edu",
                    "name": "B.Tech Student 2"
                }
