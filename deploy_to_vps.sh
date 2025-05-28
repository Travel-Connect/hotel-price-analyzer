#!/bin/bash

# XServer VPS接続情報
echo "=== XServer VPS デプロイスクリプト ==="
echo "VPSのIPアドレスを入力してください:"
read VPS_IP

echo "VPSのユーザー名を入力してください (通常はroot):"
read VPS_USER

# デプロイ先のパス
VPS_PATH="/var/www/hotel-analyzer"

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}1. VPSに接続してディレクトリを作成${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}"

echo -e "${GREEN}2. ファイルをアップロード${NC}"
echo "アップロード中..."

# 必要なファイルのみをアップロード
scp index.html ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp hotel_price_app_v2.js ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp hotel_price_style_v2.css ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp README.md ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo -e "${GREEN}3. 権限を設定${NC}"
ssh ${VPS_USER}@${VPS_IP} "chmod -R 755 ${VPS_PATH}"

echo -e "${GREEN}4. Webサーバーを起動${NC}"
echo "どのWebサーバーを使用しますか？"
echo "1) Python HTTPサーバー (ポート8080)"
echo "2) Nginx (事前にインストールが必要)"
echo "3) 既に設定済み"
read -p "選択してください (1-3): " SERVER_CHOICE

case $SERVER_CHOICE in
    1)
        echo "Python HTTPサーバーを起動します..."
        ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && nohup python3 -m http.server 8080 > /dev/null 2>&1 &"
        echo -e "${GREEN}完了！${NC}"
        echo "アクセスURL: http://${VPS_IP}:8080"
        ;;
    2)
        echo "Nginxの設定ファイルを作成します..."
        ssh ${VPS_USER}@${VPS_IP} "cat > /etc/nginx/sites-available/hotel-analyzer << EOF
server {
    listen 80;
    server_name ${VPS_IP};
    
    root ${VPS_PATH};
    index index.html;
    
    location / {
        try_files \\\$uri \\\$uri/ =404;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
EOF"
        ssh ${VPS_USER}@${VPS_IP} "ln -sf /etc/nginx/sites-available/hotel-analyzer /etc/nginx/sites-enabled/"
        ssh ${VPS_USER}@${VPS_IP} "nginx -t && systemctl restart nginx"
        echo -e "${GREEN}完了！${NC}"
        echo "アクセスURL: http://${VPS_IP}"
        ;;
    3)
        echo -e "${GREEN}完了！${NC}"
        echo "アクセスURL: http://${VPS_IP}"
        ;;
esac

echo ""
echo -e "${GREEN}デプロイが完了しました！${NC}"
echo "問題がある場合は、以下のコマンドでログを確認してください："
echo "ssh ${VPS_USER}@${VPS_IP}"