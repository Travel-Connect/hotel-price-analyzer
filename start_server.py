#!/usr/bin/env python3
"""
ホテル価格分析ツール - シンプルWebサーバー
XServer VPS用
"""

import http.server
import socketserver
import os
import sys

# デフォルトポート
PORT = 8080

# ドキュメントルート
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # CORS対応
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # キャッシュ設定
        if self.path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico')):
            self.send_header('Cache-Control', 'public, max-age=31536000')
        super().end_headers()

def main():
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = PORT
    
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", port), MyHTTPRequestHandler) as httpd:
        print(f"サーバーを起動しました")
        print(f"ポート: {port}")
        print(f"ドキュメントルート: {DIRECTORY}")
        print(f"アクセスURL: http://0.0.0.0:{port}")
        print("停止するには Ctrl+C を押してください")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを停止しました")
            sys.exit(0)

if __name__ == "__main__":
    main()