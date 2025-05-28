# 宿泊施設料金分析システム - デプロイメント手順

## 🔐 アカウント情報

### デフォルトアカウント
| 役割 | ユーザーID | パスワード | 権限 |
|------|------------|------------|------|
| 管理者 | admin | Admin@2024! | 全機能 |
| 分析担当 | hotel_analyst | Analyst#2024 | 閲覧・編集・アップロード |
| 閲覧者 | hotel_viewer | View@2024 | 閲覧・ダウンロードのみ |

**⚠️ 重要: 本番環境では必ずパスワードを変更してください！**

## 🚀 デプロイ方法

### 1. ローカル開発環境（HTTP）

```bash
# HTTPモードで起動（開発用）
python3 hotel_secure_server.py --http-only

# アクセス
http://localhost:8000/login.html
```

### 2. 本番環境（HTTPS）

```bash
# HTTPSモードで起動
python3 hotel_secure_server.py

# アクセス
https://localhost:8443/login.html
```

### 3. クラウドデプロイ（推奨）

#### AWS EC2 / Lightsail
```bash
# 1. インスタンスを作成（Ubuntu 22.04推奨）
# 2. セキュリティグループで443, 80ポートを開放
# 3. SSHでログイン

# 必要なパッケージをインストール
sudo apt update
sudo apt install python3 python3-pip nginx certbot python3-certbot-nginx

# アプリケーションをクローン
git clone [your-repo-url]
cd hotel-price-analysis

# SSL証明書を取得（Let's Encrypt）
sudo certbot --nginx -d yourdomain.com

# システムサービスとして登録
sudo cp hotel-analysis.service /etc/systemd/system/
sudo systemctl enable hotel-analysis
sudo systemctl start hotel-analysis
```

#### Heroku
```bash
# Procfileを作成
echo "web: python hotel_secure_server.py" > Procfile

# requirements.txtを作成
echo "# No external dependencies" > requirements.txt

# Herokuにデプロイ
heroku create your-app-name
git push heroku main
```

#### Docker
```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y openssl

EXPOSE 8443 8080

CMD ["python", "hotel_secure_server.py"]
```

```bash
# Dockerイメージをビルド
docker build -t hotel-analysis .

# コンテナを実行
docker run -p 8443:8443 -p 8080:8080 hotel-analysis
```

## 🔒 セキュリティ設定

### 1. パスワードの変更

`hotel_auth_config.json`を編集：

```json
{
  "users": [
    {
      "id": "admin",
      "password": "[新しいハッシュ値]",
      ...
    }
  ]
}
```

### 2. SSL証明書（本番環境）

- Let's Encryptを使用（無料）
- または商用SSL証明書を購入

### 3. 環境変数の使用

```python
# 本番環境では環境変数から設定を読み込む
import os

SESSION_SECRET = os.environ.get('SESSION_SECRET', 'default-secret')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
```

### 4. ファイアウォール設定

```bash
# UFWを使用する場合
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw enable
```

## 📊 アプリケーション機能

### 管理者権限
- ✅ 全データの閲覧・編集
- ✅ ファイルアップロード
- ✅ ユーザー管理
- ✅ アラート設定

### 分析担当者権限
- ✅ データ閲覧・編集
- ✅ ファイルアップロード
- ✅ 分析機能の利用
- ✅ レポート作成

### 閲覧者権限
- ✅ データ閲覧
- ✅ CSVダウンロード
- ❌ 編集機能なし

## 🛠️ トラブルシューティング

### ログイン問題
1. ブラウザのCookieをクリア
2. セッションファイル（hotel_sessions.json）を削除
3. サーバーを再起動

### SSL証明書エラー
- 自己署名証明書の場合、ブラウザで例外を追加
- 本番環境では正式な証明書を使用

### ポート競合
- 使用中のポートを確認: `lsof -i :8443`
- 別のポートを使用: 設定ファイルで変更

## 📞 サポート

問題が発生した場合：
1. ログファイルを確認
2. `hotel_secure_server.py`のデバッグモードを有効化
3. 必要に応じてサポートチームに連絡

---
最終更新: 2024年