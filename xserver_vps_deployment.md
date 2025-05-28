# XServer VPS デプロイメントガイド

## 1. 必要な情報

VPSに接続するために以下の情報が必要です：
- VPSのIPアドレス
- SSHポート番号（通常22）
- ユーザー名
- パスワードまたはSSHキー

## 2. 基本的なデプロイ手順

### 方法1: シンプルなHTTPサーバー（Python）

```bash
# VPSにSSH接続
ssh username@your-vps-ip

# 必要なディレクトリを作成
mkdir -p /var/www/hotel-analyzer
cd /var/www/hotel-analyzer

# ファイルをアップロード（ローカルから）
scp -r /home/tatsu/claude-practice/* username@your-vps-ip:/var/www/hotel-analyzer/

# Python HTTPサーバーを起動
python3 -m http.server 80

# またはバックグラウンドで実行
nohup python3 -m http.server 80 > server.log 2>&1 &
```

### 方法2: Nginx を使用（推奨）

```bash
# Nginxをインストール
sudo apt update
sudo apt install nginx

# Nginxの設定ファイルを作成
sudo nano /etc/nginx/sites-available/hotel-analyzer
```

Nginx設定ファイルの内容：
```nginx
server {
    listen 80;
    server_name your-vps-ip;  # またはドメイン名

    root /var/www/hotel-analyzer;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # キャッシュ設定
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/hotel-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 方法3: systemdサービスとして登録

```bash
# サービスファイルを作成
sudo nano /etc/systemd/system/hotel-analyzer.service
```

サービスファイルの内容：
```ini
[Unit]
Description=Hotel Price Analyzer Web Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/hotel-analyzer
ExecStart=/usr/bin/python3 -m http.server 8080
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# サービスを有効化して起動
sudo systemctl enable hotel-analyzer
sudo systemctl start hotel-analyzer
```

## 3. ファイアウォール設定

```bash
# ポート80を開放
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp  # HTTPS用
sudo ufw enable
```

## 4. ファイルのアップロード方法

### rsyncを使用（推奨）
```bash
# ローカルから実行
rsync -avz --exclude='.git' --exclude='*.pyc' \
  /home/tatsu/claude-practice/ \
  username@your-vps-ip:/var/www/hotel-analyzer/
```

### scpを使用
```bash
# 個別ファイル
scp index.html username@your-vps-ip:/var/www/hotel-analyzer/
scp hotel_price_app_v2.js username@your-vps-ip:/var/www/hotel-analyzer/
scp hotel_price_style_v2.css username@your-vps-ip:/var/www/hotel-analyzer/
```

## 5. SSL証明書の設定（Let's Encrypt）

```bash
# Certbotをインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書を取得
sudo certbot --nginx -d your-domain.com
```

## 6. 自動デプロイスクリプト

`deploy.sh`を作成：
```bash
#!/bin/bash
VPS_USER="username"
VPS_IP="your-vps-ip"
VPS_PATH="/var/www/hotel-analyzer"

echo "Deploying to XServer VPS..."
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='*.log' \
  ./ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo "Deployment complete!"
```

使用方法：
```bash
chmod +x deploy.sh
./deploy.sh
```

## 7. セキュリティ設定

- SSH鍵認証の設定
- ファイアウォールの適切な設定
- 定期的なシステムアップデート
- fail2banの導入

## 8. モニタリング

```bash
# Nginxのアクセスログを確認
tail -f /var/log/nginx/access.log

# エラーログを確認
tail -f /var/log/nginx/error.log
```