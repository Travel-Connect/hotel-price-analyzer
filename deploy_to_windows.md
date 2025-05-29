# Windows Server VPSへのデプロイ手順

## 必要なファイル
1. index.html
2. hotel_price_analysis_v2.html
3. hotel_price_app_v2.js
4. hotel_price_style_v2.css

## IISでの公開手順

### 1. ファイルの配置
```
C:\inetpub\wwwroot\hotel-price-analyzer\
├── index.html
├── hotel_price_analysis_v2.html
├── hotel_price_app_v2.js
└── hotel_price_style_v2.css
```

### 2. IISマネージャーでサイトを作成
1. IISマネージャーを開く
2. サイト → 既定のWebサイト → 右クリック → アプリケーションの追加
3. エイリアス: hotel-price-analyzer
4. 物理パス: C:\inetpub\wwwroot\hotel-price-analyzer

### 3. MIMEタイプの確認
- .js → application/javascript
- .css → text/css
- .json → application/json

### 4. ファイアウォール設定
- ポート80（HTTP）とポート443（HTTPS）を開放

## セキュリティ設定

### web.config ファイルを作成
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <!-- 静的コンテンツの圧縮 -->
        <staticContent>
            <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
            <mimeMap fileExtension=".json" mimeType="application/json" />
        </staticContent>
        
        <!-- セキュリティヘッダー -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>
        
        <!-- デフォルトドキュメント -->
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
        
        <!-- URLリライト（HTTPSリダイレクト） -->
        <rewrite>
            <rules>
                <rule name="Redirect to HTTPS" stopProcessing="true">
                    <match url="." />
                    <conditions>
                        <add input="{HTTPS}" pattern="off" ignoreCase="true" />
                    </conditions>
                    <action type="Redirect" url="https://{HTTP_HOST}/{R:0}" redirectType="Permanent" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

## SSL証明書の設定（Let's Encrypt）

### 1. Certbotのインストール
1. https://certbot.eff.org/instructions からWindows版をダウンロード
2. 管理者権限で実行

### 2. 証明書の取得
```cmd
certbot certonly --webroot -w C:\inetpub\wwwroot\hotel-price-analyzer -d yourdomain.com
```

### 3. IISで証明書をバインド
1. IISマネージャー → サーバー証明書
2. 証明書をインポート
3. サイトのバインディングでHTTPS（443）を追加

## パフォーマンス最適化

### 1. 静的コンテンツの圧縮
IISマネージャー → 圧縮 → 静的コンテンツの圧縮を有効化

### 2. アプリケーションプールの設定
- .NET CLRバージョン: マネージコードなし
- マネージパイプラインモード: 統合
- アイドルタイムアウト: 0（常に起動）

## 自動デプロイスクリプト

### deploy.ps1
```powershell
# デプロイスクリプト
$sourcePath = ".\hotel-price-analyzer\"
$destinationPath = "C:\inetpub\wwwroot\hotel-price-analyzer\"

# ファイルをコピー
Copy-Item -Path "$sourcePath*" -Destination $destinationPath -Recurse -Force

# IISを再起動
iisreset /restart

Write-Host "デプロイが完了しました" -ForegroundColor Green
```

## アクセス方法
- ローカル: http://localhost/hotel-price-analyzer/
- 外部: http://your-vps-ip/hotel-price-analyzer/
- ドメイン設定後: https://yourdomain.com/

## トラブルシューティング

### 404エラーの場合
- 静的コンテンツ機能が有効か確認
- MIMEタイプが正しく設定されているか確認

### JavaScriptが動作しない場合
- ブラウザの開発者ツールでエラーを確認
- Content-Type が正しいか確認

### アクセスが遅い場合
- 静的コンテンツの圧縮を有効化
- CDNの使用を検討