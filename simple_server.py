#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8888
os.chdir('/home/tatsu/claude-practice')

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"サーバーがポート {PORT} で起動しました")
    print(f"http://localhost:{PORT}/hotel_price_analysis_v2.html")
    httpd.serve_forever()