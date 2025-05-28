#!/usr/bin/env python3
import http.server
import socketserver
import json
import hashlib
import uuid
import os
import urllib.parse
from datetime import datetime, timedelta
from http.cookies import SimpleCookie
import ssl
import argparse

# 設定
PORT = 8443  # HTTPS用ポート
HTTP_PORT = 8080  # HTTPリダイレクト用
CERT_FILE = "server.crt"
KEY_FILE = "server.key"
CONFIG_FILE = "hotel_auth_config.json"
SESSIONS_FILE = "hotel_sessions.json"

class SecureHotelServer:
    def __init__(self):
        self.config = self.load_config()
        self.sessions = self.load_sessions()
        self.setup_default_users()
    
    def load_config(self):
        """設定ファイルの読み込み"""
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def load_sessions(self):
        """セッション情報の読み込み"""
        if os.path.exists(SESSIONS_FILE):
            try:
                with open(SESSIONS_FILE, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_sessions(self):
        """セッション情報の保存"""
        with open(SESSIONS_FILE, 'w') as f:
            json.dump(self.sessions, f)
    
    def setup_default_users(self):
        """デフォルトユーザーの設定"""
        # 実際の運用では環境変数から取得
        default_users = {
            "admin": {
                "password": "Admin@2024!",
                "hashed": self.hash_password("Admin@2024!"),
                "role": "admin",
                "name": "管理者"
            },
            "hotel_analyst": {
                "password": "Analyst#2024",
                "hashed": self.hash_password("Analyst#2024"),
                "role": "analyst", 
                "name": "ホテル分析担当"
            },
            "hotel_viewer": {
                "password": "View@2024",
                "hashed": self.hash_password("View@2024"),
                "role": "viewer",
                "name": "閲覧ユーザー"
            }
        }
        
        # 設定ファイルのユーザー情報を更新
        for user_id, user_info in default_users.items():
            user_exists = False
            for user in self.config['users']:
                if user['id'] == user_id:
                    user['password'] = user_info['hashed']
                    user_exists = True
                    break
            
            if not user_exists:
                self.config['users'].append({
                    "id": user_id,
                    "password": user_info['hashed'],
                    "role": user_info['role'],
                    "name": user_info['name'],
                    "email": f"{user_id}@hotelanalysis.com"
                })
        
        # 設定を保存
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
    
    def hash_password(self, password):
        """パスワードのハッシュ化"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def create_session(self, user_id, user_role):
        """セッション作成"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            'user_id': user_id,
            'role': user_role,
            'created_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(seconds=self.config['session']['expiry'])).isoformat()
        }
        self.save_sessions()
        return session_id
    
    def validate_session(self, session_id):
        """セッション検証"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        if datetime.fromisoformat(session['expires_at']) < datetime.now():
            del self.sessions[session_id]
            self.save_sessions()
            return None
        
        return session
    
    def authenticate(self, user_id, password):
        """ユーザー認証"""
        for user in self.config['users']:
            if user['id'] == user_id:
                if user['password'] == self.hash_password(password):
                    return user
        return None

class SecureHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, server_instance=None, **kwargs):
        self.server_instance = server_instance
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """GETリクエスト処理"""
        # 認証が必要なパス
        protected_paths = [
            '/hotel_price_analysis.html',
            '/hotel_price_app.js',
            '/hotel_price_advanced.js'
        ]
        
        # 認証チェック
        if any(self.path.startswith(p) for p in protected_paths):
            if not self.check_auth():
                self.redirect_to_login()
                return
        
        # 認証API
        if self.path == '/api/auth/check':
            self.handle_auth_check()
        elif self.path == '/api/auth/logout':
            self.handle_logout()
        else:
            # 静的ファイルの提供
            self.add_security_headers()
            super().do_GET()
    
    def do_POST(self):
        """POSTリクエスト処理"""
        if self.path == '/api/auth/login':
            self.handle_login()
        else:
            self.send_error(404)
    
    def check_auth(self):
        """認証チェック"""
        cookie = SimpleCookie(self.headers.get('Cookie'))
        session_id = cookie.get('session_id')
        
        if session_id:
            session = self.server_instance.validate_session(session_id.value)
            if session:
                return True
        
        return False
    
    def redirect_to_login(self):
        """ログインページへリダイレクト"""
        self.send_response(302)
        self.send_header('Location', f'/login.html?redirect={urllib.parse.quote(self.path)}')
        self.end_headers()
    
    def handle_login(self):
        """ログイン処理"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        params = urllib.parse.parse_qs(post_data)
        
        user_id = params.get('username', [''])[0]
        password = params.get('password', [''])[0]
        
        user = self.server_instance.authenticate(user_id, password)
        
        if user:
            session_id = self.server_instance.create_session(user['id'], user['role'])
            
            self.send_response(200)
            self.send_header('Set-Cookie', 
                f'session_id={session_id}; Path=/; HttpOnly; SameSite=Strict; Max-Age={self.server_instance.config["session"]["expiry"]}')
            self.send_header('Content-type', 'application/json')
            self.add_security_headers()
            self.end_headers()
            
            response = {
                'success': True,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'role': user['role']
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(401)
            self.send_header('Content-type', 'application/json')
            self.add_security_headers()
            self.end_headers()
            
            response = {
                'success': False,
                'message': 'ユーザーIDまたはパスワードが正しくありません'
            }
            self.wfile.write(json.dumps(response).encode())
    
    def handle_auth_check(self):
        """認証状態チェック"""
        cookie = SimpleCookie(self.headers.get('Cookie'))
        session_id = cookie.get('session_id')
        
        if session_id:
            session = self.server_instance.validate_session(session_id.value)
            if session:
                # ユーザー情報を取得
                user = None
                for u in self.server_instance.config['users']:
                    if u['id'] == session['user_id']:
                        user = u
                        break
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.add_security_headers()
                self.end_headers()
                
                response = {
                    'authenticated': True,
                    'user': {
                        'id': user['id'],
                        'name': user['name'],
                        'role': user['role'],
                        'permissions': self.server_instance.config['roles'][user['role']]['permissions']
                    }
                }
                self.wfile.write(json.dumps(response).encode())
                return
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.add_security_headers()
        self.end_headers()
        
        response = {'authenticated': False}
        self.wfile.write(json.dumps(response).encode())
    
    def handle_logout(self):
        """ログアウト処理"""
        cookie = SimpleCookie(self.headers.get('Cookie'))
        session_id = cookie.get('session_id')
        
        if session_id and session_id.value in self.server_instance.sessions:
            del self.server_instance.sessions[session_id.value]
            self.server_instance.save_sessions()
        
        self.send_response(200)
        self.send_header('Set-Cookie', 'session_id=; Path=/; Max-Age=0')
        self.send_header('Content-type', 'application/json')
        self.add_security_headers()
        self.end_headers()
        
        response = {'success': True}
        self.wfile.write(json.dumps(response).encode())
    
    def add_security_headers(self):
        """セキュリティヘッダーの追加"""
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Content-Security-Policy', "default-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com")

def create_self_signed_cert():
    """自己署名証明書の作成"""
    if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
        print("自己署名証明書を作成しています...")
        os.system(f"""
            openssl req -x509 -newkey rsa:4096 -keyout {KEY_FILE} -out {CERT_FILE} \
            -days 365 -nodes -subj "/C=JP/ST=Tokyo/L=Tokyo/O=HotelAnalysis/CN=localhost"
        """)

def run_redirect_server():
    """HTTPからHTTPSへのリダイレクトサーバー"""
    class RedirectHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            self.send_response(301)
            self.send_header('Location', f'https://{self.headers["Host"].split(":")[0]}:{PORT}{self.path}')
            self.end_headers()
    
    with socketserver.TCPServer(("", HTTP_PORT), RedirectHandler) as httpd:
        print(f"HTTPリダイレクトサーバー起動: http://localhost:{HTTP_PORT}")
        httpd.serve_forever()

def main():
    parser = argparse.ArgumentParser(description='Secure Hotel Price Analysis Server')
    parser.add_argument('--http-only', action='store_true', help='HTTPモードで起動（開発用）')
    args = parser.parse_args()
    
    # サーバーインスタンスの作成
    server = SecureHotelServer()
    
    print("\n" + "="*60)
    print("🏨 宿泊施設料金分析システム - セキュアサーバー")
    print("="*60)
    print("\n📋 デフォルトアカウント:")
    print("  管理者:     admin / Admin@2024!")
    print("  分析担当:   hotel_analyst / Analyst#2024")
    print("  閲覧者:     hotel_viewer / View@2024")
    print("\n⚠️  本番環境では必ずパスワードを変更してください！")
    
    if args.http_only:
        # HTTP モード（開発用）
        PORT = 8001
        handler = lambda *args, **kwargs: SecureHTTPHandler(*args, server_instance=server, **kwargs)
        
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"\n🌐 開発サーバー起動: http://localhost:{PORT}")
            print(f"   ログイン: http://localhost:{PORT}/login.html")
            print(f"   アプリ: http://localhost:{PORT}/hotel_price_analysis.html")
            print("\nCtrl+C で停止します")
            httpd.serve_forever()
    else:
        # HTTPS モード（本番用）
        create_self_signed_cert()
        
        # HTTPSサーバーの起動
        handler = lambda *args, **kwargs: SecureHTTPHandler(*args, server_instance=server, **kwargs)
        
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            # SSL設定
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(CERT_FILE, KEY_FILE)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"\n🔒 HTTPSサーバー起動: https://localhost:{PORT}")
            print(f"   ログイン: https://localhost:{PORT}/login.html")
            print(f"   アプリ: https://localhost:{PORT}/hotel_price_analysis.html")
            print("\nCtrl+C で停止します")
            
            # HTTPリダイレクトサーバーを別スレッドで起動
            import threading
            redirect_thread = threading.Thread(target=run_redirect_server, daemon=True)
            redirect_thread.start()
            
            httpd.serve_forever()

if __name__ == "__main__":
    main()