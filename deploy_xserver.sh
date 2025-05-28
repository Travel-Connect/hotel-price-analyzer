#!/bin/bash

echo "======================================"
echo "Xサーバー Web公開スクリプト"
echo "======================================"
echo ""

# Xサーバーのタイプを選択
echo "Xサーバーのタイプを選択してください："
echo "1) Xサーバー（レンタルサーバー）"
echo "2) Xサーバー VPS（Linux）"
echo "3) Xサーバー VPS（Windows）"
read -p "選択 (1-3): " SERVER_TYPE

case $SERVER_TYPE in
    1)
        echo ""
        echo "=== Xサーバー（レンタルサーバー）へのアップロード ==="
        echo ""
        echo "FTP情報を入力してください："
        read -p "FTPホスト名 (例: sv12345.xserver.jp): " FTP_HOST
        read -p "FTPユーザー名: " FTP_USER
        read -s -p "FTPパスワード: " FTP_PASS
        echo ""
        read -p "アップロード先ディレクトリ (例: /public_html/hotel): " REMOTE_DIR
        
        echo ""
        echo "FTPでアップロード中..."
        
        # FTPコマンドでアップロード
        ftp -inv $FTP_HOST << EOF
user $FTP_USER $FTP_PASS
binary
cd $REMOTE_DIR
put index.html
put hotel_price_app_v2.js
put hotel_price_style_v2.css
bye
EOF
        
        echo ""
        echo "アップロード完了！"
        echo "ブラウザでご確認ください。"
        ;;
        
    2)
        echo ""
        echo "=== Xサーバー VPS（Linux）へのデプロイ ==="
        echo ""
        read -p "VPSのIPアドレス: " VPS_IP
        read -p "SSHユーザー名 (通常root): " SSH_USER
        
        echo ""
        echo "ファイルを転送中..."
        
        # SCPでファイル転送
        ssh $SSH_USER@$VPS_IP "mkdir -p /var/www/hotel-analyzer"
        scp index.html $SSH_USER@$VPS_IP:/var/www/hotel-analyzer/
        scp hotel_price_app_v2.js $SSH_USER@$VPS_IP:/var/www/hotel-analyzer/
        scp hotel_price_style_v2.css $SSH_USER@$VPS_IP:/var/www/hotel-analyzer/
        
        echo ""
        echo "Webサーバーを設定しますか？"
        echo "1) Nginx"
        echo "2) Apache"
        echo "3) Python簡易サーバー"
        echo "4) スキップ"
        read -p "選択 (1-4): " WEB_SERVER
        
        case $WEB_SERVER in
            1)
                ssh $SSH_USER@$VPS_IP "apt update && apt install -y nginx"
                # Nginx設定
                ;;
            2)
                ssh $SSH_USER@$VPS_IP "apt update && apt install -y apache2"
                # Apache設定
                ;;
            3)
                ssh $SSH_USER@$VPS_IP "cd /var/www/hotel-analyzer && python3 -m http.server 80 &"
                ;;
        esac
        
        echo ""
        echo "デプロイ完了！"
        echo "URL: http://$VPS_IP/"
        ;;
        
    3)
        echo ""
        echo "=== Xサーバー VPS（Windows）==="
        echo ""
        echo "Windows Serverの場合は、以下の手順で行ってください："
        echo ""
        echo "1. リモートデスクトップで接続"
        echo "2. hotel-analyzer-final.tar.gz をダウンロード"
        echo "3. C:\\inetpub\\wwwroot\\hotel-analyzer\\ に解凍"
        echo "4. IISマネージャーでサイトを設定"
        echo ""
        echo "詳細は windows_server_deployment.md を参照してください。"
        ;;
esac

echo ""
echo "======================================"
echo "完了"
echo "======================================