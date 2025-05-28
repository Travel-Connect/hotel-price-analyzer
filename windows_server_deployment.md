# Windows Server デプロイメントガイド

## 1. IIS（Internet Information Services）を使用した公開（推奨）

### IISのインストール

1. **サーバーマネージャーを開く**
2. **役割と機能の追加**をクリック
3. **Webサーバー (IIS)** を選択してインストール

### PowerShellでインストール（管理者権限）：
```powershell
Install-WindowsFeature -name Web-Server -IncludeManagementTools
```

### Webサイトの設定

1. **IISマネージャーを開く**
   - Win + R → `inetmgr` → Enter

2. **新しいWebサイトを作成**
   - サイト名: `HotelPriceAnalyzer`
   - 物理パス: `C:\inetpub\wwwroot\hotel-analyzer`
   - ポート: 80（または任意のポート）

3. **ファイルをコピー**
```powershell
# ディレクトリ作成
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\hotel-analyzer" -Force

# ファイルをコピー（ファイルの場所に応じて変更）
Copy-Item "index.html" -Destination "C:\inetpub\wwwroot\hotel-analyzer\"
Copy-Item "hotel_price_app_v2.js" -Destination "C:\inetpub\wwwroot\hotel-analyzer\"
Copy-Item "hotel_price_style_v2.css" -Destination "C:\inetpub\wwwroot\hotel-analyzer\"
```

### MIMEタイプの設定（必要に応じて）
```xml
<configuration>
  <system.webServer>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

## 2. シンプルなHTTPサーバー（Python）

### Pythonがインストールされている場合

1. **バッチファイルを作成** `start_server.bat`:
```batch
@echo off
cd /d C:\hotel-analyzer
echo ホテル価格分析ツール - Webサーバー起動
echo =====================================
echo アクセスURL: http://localhost:8080
echo 停止するには Ctrl+C を押してください
echo.
python -m http.server 8080
pause
```

2. **PowerShellスクリプト** `Start-WebServer.ps1`:
```powershell
$port = 8080
$root = "C:\hotel-analyzer"

Write-Host "ホテル価格分析ツール - Webサーバー" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "ポート: $port"
Write-Host "ドキュメントルート: $root"
Write-Host "アクセスURL: http://localhost:$port"
Write-Host "停止するには Ctrl+C を押してください" -ForegroundColor Yellow

Set-Location $root
python -m http.server $port
```

## 3. Node.jsを使用したサーバー

### Node.jsサーバースクリプト `server.js`:
```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}/`);
});
```

### 起動バッチファイル `start_node_server.bat`:
```batch
@echo off
cd /d C:\hotel-analyzer
node server.js
pause
```

## 4. Windowsサービスとして登録

### NSSMを使用してサービス化

1. **NSSM（Non-Sucking Service Manager）をダウンロード**
   - https://nssm.cc/download

2. **サービスをインストール**
```batch
nssm install HotelAnalyzer "C:\Python\python.exe" "-m http.server 8080"
nssm set HotelAnalyzer AppDirectory "C:\hotel-analyzer"
nssm set HotelAnalyzer DisplayName "Hotel Price Analyzer Web Server"
nssm set HotelAnalyzer Description "ホテル価格分析ツールのWebサーバー"
nssm set HotelAnalyzer Start SERVICE_AUTO_START
```

3. **サービスを開始**
```batch
nssm start HotelAnalyzer
```

## 5. ファイアウォール設定

### Windows Defenderファイアウォールでポートを開く

PowerShell（管理者権限）：
```powershell
# ポート80を開く（IIS用）
New-NetFirewallRule -DisplayName "Hotel Analyzer HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# ポート8080を開く（Python/Node.js用）
New-NetFirewallRule -DisplayName "Hotel Analyzer 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

## 6. セキュリティ設定

### IISでの基本認証設定
```powershell
# 基本認証を有効化
Install-WindowsFeature Web-Basic-Auth
```

### IPアドレス制限
```xml
<configuration>
  <system.webServer>
    <security>
      <ipSecurity allowUnlisted="false">
        <add ipAddress="192.168.1.0" subnetMask="255.255.255.0" allowed="true" />
      </ipSecurity>
    </security>
  </system.webServer>
</configuration>
```

## 7. 自動起動設定

### タスクスケジューラーを使用

1. タスクスケジューラーを開く
2. 「基本タスクの作成」をクリック
3. トリガー: 「コンピューターの起動時」
4. 操作: 「プログラムの開始」
5. プログラム: `C:\hotel-analyzer\start_server.bat`

## 8. リモートアクセス設定

外部からアクセスする場合：
1. ルーターでポートフォワーディング設定
2. Windows Firewallで該当ポートを開放
3. 固定IPまたはDDNSサービスを使用

## 9. トラブルシューティング

### ポートが使用中の場合
```powershell
# ポート使用状況を確認
netstat -ano | findstr :80
netstat -ano | findstr :8080

# プロセスを確認
tasklist /FI "PID eq [PID番号]"
```

### IISが起動しない場合
```powershell
# IISサービスを再起動
iisreset /restart
```

### ログの確認
- IISログ: `C:\inetpub\logs\LogFiles`
- イベントログ: イベントビューアー → Windowsログ → システム