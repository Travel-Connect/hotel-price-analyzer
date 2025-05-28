# Xサーバー Web公開ガイド

## 1. Xサーバーの種類を確認

### A. Xサーバー（レンタルサーバー）の場合

#### 必要な情報
- Xサーバーアカウント名
- FTPホスト名（例：sv12345.xserver.jp）
- FTPユーザー名
- FTPパスワード

#### アップロード手順

1. **FTPクライアントを使用**
   - FileZilla、CyberDuck、WinSCPなど
   - ホスト: あなたのサーバー名.xserver.jp
   - ユーザー名: Xサーバーのアカウント名
   - パスワード: FTPパスワード
   - ポート: 21（通常）

2. **アップロード先**
   ```
   /home/アカウント名/ドメイン名/public_html/hotel-analyzer/
   ```

3. **必要なファイル**
   - index.html
   - hotel_price_app_v2.js
   - hotel_price_style_v2.css

### B. Xサーバー VPS（Linux）の場合

#### SSH接続
```bash
ssh root@あなたのVPSのIP
```

#### Webサーバー設定

1. **Nginx の場合**
```bash
# Nginxインストール
sudo apt update
sudo apt install nginx

# ディレクトリ作成
sudo mkdir -p /var/www/hotel-analyzer

# ファイルアップロード（ローカルから）
scp index.html root@VPSのIP:/var/www/hotel-analyzer/
scp hotel_price_app_v2.js root@VPSのIP:/var/www/hotel-analyzer/
scp hotel_price_style_v2.css root@VPSのIP:/var/www/hotel-analyzer/

# Nginx設定
sudo nano /etc/nginx/sites-available/hotel-analyzer
```

Nginx設定ファイル：
```nginx
server {
    listen 80;
    server_name あなたのドメイン.com;
    
    root /var/www/hotel-analyzer;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # gzip圧縮
    gzip on;
    gzip_types text/css application/javascript;
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/hotel-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

2. **Apache の場合**
```bash
# Apacheインストール
sudo apt install apache2

# ディレクトリ作成
sudo mkdir -p /var/www/html/hotel-analyzer

# ファイルコピー
sudo cp index.html /var/www/html/hotel-analyzer/
sudo cp hotel_price_app_v2.js /var/www/html/hotel-analyzer/
sudo cp hotel_price_style_v2.css /var/www/html/hotel-analyzer/

# 権限設定
sudo chown -R www-data:www-data /var/www/html/hotel-analyzer
```

## 2. 一括アップロードスクリプト

### FTP自動アップロード（deploy_to_xserver.sh）
```bash
#!/bin/bash

# Xサーバー情報
FTP_HOST="あなたのサーバー.xserver.jp"
FTP_USER="あなたのユーザー名"
FTP_PASS="あなたのパスワード"
REMOTE_DIR="/home/アカウント名/ドメイン名/public_html/hotel-analyzer"

# FTPアップロード
ftp -n $FTP_HOST <<END_SCRIPT
quote USER $FTP_USER
quote PASS $FTP_PASS
binary
mkdir $REMOTE_DIR
cd $REMOTE_DIR
put index.html
put hotel_price_app_v2.js
put hotel_price_style_v2.css
quit
END_SCRIPT

echo "アップロード完了！"
echo "URL: https://あなたのドメイン.com/hotel-analyzer/"
```

## 3. セキュリティ設定

### .htaccess ファイル作成
```apache
# キャッシュ設定
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
</IfModule>

# gzip圧縮
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>

# セキュリティヘッダー
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
```

## 4. 独自ドメイン設定

Xサーバーの管理パネルで：
1. ドメイン設定 → ドメイン追加
2. SSL設定 → 無料SSL設定
3. DNS設定（必要に応じて）

## 5. アクセスURL

設定完了後：
- https://あなたのドメイン.com/hotel-analyzer/
- または
- https://あなたのサーバー名.xserver.jp/hotel-analyzer/