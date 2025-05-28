#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
import hashlib
import uuid
import urllib.parse
from datetime import datetime, timedelta
from http.cookies import SimpleCookie

PORT = 8001
USERS_FILE = "users.json"
SESSIONS_FILE = "sessions.json"

class User:
    def __init__(self, username, password_hash, email="", created_at=None):
        self.username = username
        self.password_hash = password_hash
        self.email = email
        self.created_at = created_at or datetime.now().isoformat()
    
    def to_dict(self):
        return {
            'username': self.username,
            'password_hash': self.password_hash,
            'email': self.email,
            'created_at': self.created_at
        }
    
    @staticmethod
    def hash_password(password):
        return hashlib.sha256(password.encode()).hexdigest()

class SessionManager:
    def __init__(self):
        self.sessions = self.load_sessions()
    
    def load_sessions(self):
        if os.path.exists(SESSIONS_FILE):
            try:
                with open(SESSIONS_FILE, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_sessions(self):
        with open(SESSIONS_FILE, 'w') as f:
            json.dump(self.sessions, f)
    
    def create_session(self, username):
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            'username': username,
            'created_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(hours=24)).isoformat()
        }
        self.save_sessions()
        return session_id
    
    def validate_session(self, session_id):
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        if datetime.fromisoformat(session['expires_at']) < datetime.now():
            del self.sessions[session_id]
            self.save_sessions()
            return None
        
        return session['username']
    
    def destroy_session(self, session_id):
        if session_id in self.sessions:
            del self.sessions[session_id]
            self.save_sessions()

class UserManager:
    def __init__(self):
        self.users = self.load_users()
    
    def load_users(self):
        if os.path.exists(USERS_FILE):
            try:
                with open(USERS_FILE, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_users(self):
        with open(USERS_FILE, 'w') as f:
            json.dump(self.users, f, indent=2)
    
    def create_user(self, username, password, email=""):
        if username in self.users:
            return False, "ユーザー名は既に使用されています"
        
        user = User(username, User.hash_password(password), email)
        self.users[username] = user.to_dict()
        self.save_users()
        return True, "ユーザーを作成しました"
    
    def authenticate(self, username, password):
        if username not in self.users:
            return False
        
        user = self.users[username]
        return user['password_hash'] == User.hash_password(password)

class AuthHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.user_manager = UserManager()
        self.session_manager = SessionManager()
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        if self.path == '/login.html':
            self.serve_login_page()
        elif self.path == '/auth/check':
            self.check_auth()
        elif self.path == '/auth/logout':
            self.handle_logout()
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/auth/login':
            self.handle_login()
        elif self.path == '/auth/register':
            self.handle_register()
        else:
            self.send_error(404)
    
    def serve_login_page(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        
        # ログインページを提供
        with open('login.html', 'rb') as f:
            self.wfile.write(f.read())
    
    def handle_login(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        params = urllib.parse.parse_qs(post_data)
        
        username = params.get('username', [''])[0]
        password = params.get('password', [''])[0]
        
        if self.user_manager.authenticate(username, password):
            session_id = self.session_manager.create_session(username)
            
            self.send_response(200)
            self.send_header('Set-Cookie', f'session_id={session_id}; Path=/; HttpOnly')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': True,
                'message': 'ログインしました',
                'username': username
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(401)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': False,
                'message': 'ユーザー名またはパスワードが正しくありません'
            }
            self.wfile.write(json.dumps(response).encode())
    
    def handle_register(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        params = urllib.parse.parse_qs(post_data)
        
        username = params.get('username', [''])[0]
        password = params.get('password', [''])[0]
        email = params.get('email', [''])[0]
        
        if len(username) < 3 or len(password) < 6:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': False,
                'message': 'ユーザー名は3文字以上、パスワードは6文字以上必要です'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        success, message = self.user_manager.create_user(username, password, email)
        
        if success:
            self.send_response(200)
        else:
            self.send_response(400)
        
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {'success': success, 'message': message}
        self.wfile.write(json.dumps(response).encode())
    
    def handle_logout(self):
        cookie = SimpleCookie(self.headers.get('Cookie'))
        session_id = cookie.get('session_id')
        
        if session_id:
            self.session_manager.destroy_session(session_id.value)
        
        self.send_response(200)
        self.send_header('Set-Cookie', 'session_id=; Path=/; Max-Age=0')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {'success': True, 'message': 'ログアウトしました'}
        self.wfile.write(json.dumps(response).encode())
    
    def check_auth(self):
        cookie = SimpleCookie(self.headers.get('Cookie'))
        session_id = cookie.get('session_id')
        
        if session_id:
            username = self.session_manager.validate_session(session_id.value)
            if username:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                response = {
                    'authenticated': True,
                    'username': username
                }
                self.wfile.write(json.dumps(response).encode())
                return
        
        self.send_response(401)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {'authenticated': False}
        self.wfile.write(json.dumps(response).encode())

def main():
    # デフォルトユーザーを作成
    user_manager = UserManager()
    user_manager.create_user("demo", "demo123", "demo@example.com")
    user_manager.create_user("admin", "admin123", "admin@example.com")
    
    print(f"認証サーバーを起動しました: http://localhost:{PORT}")
    print("デフォルトユーザー:")
    print("  - demo / demo123")
    print("  - admin / admin123")
    print("\nCtrl+C で停止します")
    
    with socketserver.TCPServer(("", PORT), AuthHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    main()