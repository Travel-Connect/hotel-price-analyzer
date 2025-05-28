#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 9999
os.chdir('/home/tatsu/claude-practice')

print("=== クイックデプロイサーバー ===")
print(f"Windows Serverから以下のファイルをダウンロードできます：")
print(f"http://[このPCのIP]:{PORT}/index.html")
print(f"http://[このPCのIP]:{PORT}/hotel_price_app_v2.js")
print(f"http://[このPCのIP]:{PORT}/hotel_price_style_v2.css")
print(f"\nCtrl+C で停止")

with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    httpd.serve_forever()