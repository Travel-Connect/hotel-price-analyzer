#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # 認証をバイパス（開発用）
        if self.path == '/api/auth/check':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = '''{"authenticated": true, "user": {"id": "demo", "name": "デモユーザー", "role": "admin", "permissions": ["view", "edit", "upload", "download", "configure_alerts"]}}'''
            self.wfile.write(response.encode())
        else:
            super().do_GET()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"シンプルサーバーを起動しました: http://localhost:{PORT}")
print(f"宿泊施設料金分析アプリ: http://localhost:{PORT}/hotel_price_analysis.html")
print("\nCtrl+C で停止します")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    httpd.serve_forever()