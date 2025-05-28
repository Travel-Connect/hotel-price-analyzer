#!/bin/bash

# XServer VPS (Windows Server) への転送スクリプト
SERVER_IP="162.43.57.215"

echo "======================================"
echo "XServer VPS (Windows) への転送"
echo "IP: $SERVER_IP"
echo "======================================"
echo ""

# ユーザー名を入力
read -p "Windowsのユーザー名を入力してください (例: Administrator): " WINDOWS_USER

# 転送先パスを入力
echo "転送先のパスを入力してください"
echo "例: C:/inetpub/wwwroot/hotel-analyzer"
echo "または: C:/hotel-analyzer"
read -p "転送先パス: " WINDOWS_PATH

# 確認
echo ""
echo "以下の設定で転送します："
echo "サーバー: $SERVER_IP"
echo "ユーザー: $WINDOWS_USER"
echo "転送先: $WINDOWS_PATH"
echo ""
read -p "続行しますか？ (y/n): " confirm

if [[ $confirm != "y" ]]; then
    echo "キャンセルしました"
    exit 0
fi

# ディレクトリ作成を試みる
echo ""
echo "転送先ディレクトリを作成中..."
ssh "${WINDOWS_USER}@${SERVER_IP}" "cmd /c mkdir \"${WINDOWS_PATH}\" 2>nul"

# ファイル転送
echo ""
echo "ファイルを転送中..."

# 必要なファイル
FILES=(
    "index.html"
    "hotel_price_app_v2.js"
    "hotel_price_style_v2.css"
    "start_windows_server.bat"
    "Deploy-WindowsServer.ps1"
)

# 転送実行
for file in "${FILES[@]}"; do
    echo -n "転送中: $file ... "
    if scp "/home/tatsu/claude-practice/$file" "${WINDOWS_USER}@${SERVER_IP}:\"${WINDOWS_PATH}/\""; then
        echo "OK"
    else
        echo "失敗"
        echo "エラーが発生しました。SSHが有効か確認してください。"
        exit 1
    fi
done

echo ""
echo "======================================"
echo "転送完了！"
echo ""
echo "次の手順："
echo "1. リモートデスクトップで $SERVER_IP に接続"
echo "2. $WINDOWS_PATH フォルダを開く"
echo "3. start_windows_server.bat をダブルクリック"
echo ""
echo "または、PowerShellで："
echo "cd $WINDOWS_PATH"
echo ".\\Deploy-WindowsServer.ps1"
echo "======================================"