# ホテル価格分析ツール - Windows Server デプロイメントスクリプト

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet("IIS", "Python", "Node")]
    [string]$ServerType = "IIS",
    
    [Parameter()]
    [int]$Port = 8080,
    
    [Parameter()]
    [string]$InstallPath = "C:\hotel-analyzer"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " ホテル価格分析ツール - Windows Server" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 管理者権限チェック
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin -and $Port -lt 1024) {
    Write-Host "エラー: ポート$Port を使用するには管理者権限が必要です。" -ForegroundColor Red
    Write-Host "PowerShellを管理者として実行してください。" -ForegroundColor Yellow
    exit 1
}

# ファイルの存在確認
$requiredFiles = @("index.html", "hotel_price_app_v2.js", "hotel_price_style_v2.css")
$currentPath = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($file in $requiredFiles) {
    if (-not (Test-Path "$currentPath\$file")) {
        Write-Host "エラー: 必要なファイル '$file' が見つかりません。" -ForegroundColor Red
        exit 1
    }
}

# インストールディレクトリ作成
if (-not (Test-Path $InstallPath)) {
    Write-Host "ディレクトリを作成中: $InstallPath" -ForegroundColor Green
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# ファイルコピー
Write-Host "ファイルをコピー中..." -ForegroundColor Green
foreach ($file in $requiredFiles) {
    Copy-Item "$currentPath\$file" -Destination $InstallPath -Force
    Write-Host "  - $file" -ForegroundColor Gray
}

switch ($ServerType) {
    "IIS" {
        Write-Host "`nIISセットアップ..." -ForegroundColor Green
        
        # IISがインストールされているか確認
        $iisFeature = Get-WindowsFeature -Name Web-Server
        if ($iisFeature.InstallState -ne "Installed") {
            Write-Host "IISをインストール中..." -ForegroundColor Yellow
            Install-WindowsFeature -Name Web-Server -IncludeManagementTools
        }
        
        # IISでサイトを作成
        Import-Module WebAdministration
        
        $siteName = "HotelPriceAnalyzer"
        $sitePath = $InstallPath
        
        # 既存のサイトを削除
        if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
            Remove-Website -Name $siteName
        }
        
        # 新しいサイトを作成
        New-Website -Name $siteName -Port $Port -PhysicalPath $sitePath
        
        # ファイアウォールルールを追加
        $ruleName = "Hotel Analyzer Port $Port"
        if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow
        }
        
        Write-Host "`n完了！" -ForegroundColor Green
        Write-Host "アクセスURL: http://localhost:$Port" -ForegroundColor Yellow
    }
    
    "Python" {
        Write-Host "`nPythonサーバーを起動中..." -ForegroundColor Green
        
        # Pythonがインストールされているか確認
        try {
            $pythonVersion = python --version 2>&1
            Write-Host "Python: $pythonVersion" -ForegroundColor Gray
        } catch {
            Write-Host "エラー: Pythonがインストールされていません。" -ForegroundColor Red
            exit 1
        }
        
        # ファイアウォールルールを追加
        $ruleName = "Hotel Analyzer Port $Port"
        if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow
        }
        
        Write-Host "`nサーバー起動中..." -ForegroundColor Green
        Write-Host "アクセスURL: http://localhost:$Port" -ForegroundColor Yellow
        Write-Host "停止するには Ctrl+C を押してください" -ForegroundColor Yellow
        Write-Host ""
        
        Set-Location $InstallPath
        & python -m http.server $Port
    }
    
    "Node" {
        Write-Host "`nNode.jsサーバーセットアップ..." -ForegroundColor Green
        
        # server.jsを作成
        $serverJs = @'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || $Port;
const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
        } else {
            res.writeHead(200);
            res.end(content);
        }
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
'@
        
        $serverJs | Out-File -FilePath "$InstallPath\server.js" -Encoding UTF8
        
        Write-Host "Node.jsサーバーを起動してください:" -ForegroundColor Yellow
        Write-Host "cd $InstallPath" -ForegroundColor Gray
        Write-Host "node server.js" -ForegroundColor Gray
    }
}

Write-Host "`n外部からアクセスする場合:" -ForegroundColor Cyan
Write-Host "1. ルーターでポート$Port をフォワーディング" -ForegroundColor Gray
Write-Host "2. 固定IPまたはDDNSを設定" -ForegroundColor Gray
Write-Host "3. Windows Defenderファイアウォールで許可" -ForegroundColor Gray