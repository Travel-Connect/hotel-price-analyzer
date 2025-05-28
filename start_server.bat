@echo off
echo ホテル価格分析システムのサーバーを起動しています...
echo.
echo 以下のURLでアクセスしてください：
echo http://localhost:8080/hotel_price_analysis_v2.html
echo.
echo サーバーを停止するには、このウィンドウを閉じるか Ctrl+C を押してください。
echo.
cd /d "%~dp0"
python -m http.server 8080