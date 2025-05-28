#!/bin/bash

echo "Windows Serverへのファイル転送スクリプト"
echo "======================================="

# Windows ServerのIP/ホスト名を入力
read -p "Windows ServerのIPアドレスまたはホスト名: " WINDOWS_HOST
read -p "Windowsのユーザー名: " WINDOWS_USER
read -p "転送先のパス (例: C:/hotel-analyzer): " WINDOWS_PATH

# Windowsのパス形式に変換（/を\に）
WINDOWS_PATH_ESCAPED=$(echo $WINDOWS_PATH | sed 's/\//\\/g')

echo ""
echo "転送を開始します..."
echo "転送先: ${WINDOWS_USER}@${WINDOWS_HOST}:${WINDOWS_PATH_ESCAPED}"

# 必要なファイルを転送
FILES=(
    "index.html"
    "hotel_price_app_v2.js"
    "hotel_price_style_v2.css"
    "start_windows_server.bat"
    "Deploy-WindowsServer.ps1"
)

for file in "${FILES[@]}"; do
    echo "転送中: $file"
    scp "/home/tatsu/claude-practice/$file" "${WINDOWS_USER}@${WINDOWS_HOST}:\"${WINDOWS_PATH_ESCAPED}\\\"" || {
        echo "エラー: $file の転送に失敗しました"
        exit 1
    }
done

echo ""
echo "転送が完了しました！"
echo ""
echo "Windows Serverで以下を実行してください："
echo "1. cd ${WINDOWS_PATH}"
echo "2. start_windows_server.bat をダブルクリック"
echo "   または"
echo "   PowerShellで: .\\Deploy-WindowsServer.ps1"