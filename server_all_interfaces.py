#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8000
os.chdir('/home/tatsu/claude-practice')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"サーバーがポート {PORT} で起動しました（全インターフェース）")
    print(f"以下のURLでアクセスしてください：")
    print(f"http://localhost:{PORT}/hotel_price_analysis_v2.html")
    print(f"http://127.0.0.1:{PORT}/hotel_price_analysis_v2.html")
    print(f"http://172.31.86.76:{PORT}/hotel_price_analysis_v2.html")
    httpd.serve_forever()