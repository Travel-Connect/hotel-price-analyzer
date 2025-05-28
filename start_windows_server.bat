@echo off
setlocal enabledelayedexpansion

echo =====================================
echo  ホテル価格分析ツール - Windows Server
echo =====================================
echo.

:: 現在のディレクトリを取得
set CURRENT_DIR=%~dp0

echo サーバータイプを選択してください:
echo 1. IISで公開（IISがインストール済みの場合）
echo 2. Pythonサーバー（ポート8080）
echo 3. Pythonサーバー（ポート80 - 管理者権限必要）
echo 4. 終了
echo.

set /p choice="選択してください (1-4): "

if "%choice%"=="1" goto IIS_SETUP
if "%choice%"=="2" goto PYTHON_8080
if "%choice%"=="3" goto PYTHON_80
if "%choice%"=="4" goto END

:IIS_SETUP
echo.
echo IISセットアップを開始します...
echo.

:: IISディレクトリにファイルをコピー
set IIS_PATH=C:\inetpub\wwwroot\hotel-analyzer

echo ディレクトリを作成中...
if not exist "%IIS_PATH%" mkdir "%IIS_PATH%"

echo ファイルをコピー中...
copy "%CURRENT_DIR%index.html" "%IIS_PATH%\" >nul
copy "%CURRENT_DIR%hotel_price_app_v2.js" "%IIS_PATH%\" >nul
copy "%CURRENT_DIR%hotel_price_style_v2.css" "%IIS_PATH%\" >nul
copy "%CURRENT_DIR%README.md" "%IIS_PATH%\" >nul

echo.
echo 完了！
echo アクセスURL: http://localhost/hotel-analyzer/
echo.
echo IISマネージャーで詳細設定を行ってください。
pause
goto END

:PYTHON_8080
echo.
echo Pythonサーバーを起動します（ポート8080）...
echo.
cd /d "%CURRENT_DIR%"
echo アクセスURL: http://localhost:8080
echo 停止するには Ctrl+C を押してください
echo.
python -m http.server 8080
pause
goto END

:PYTHON_80
echo.
echo Pythonサーバーを起動します（ポート80）...
echo 管理者権限が必要です！
echo.
cd /d "%CURRENT_DIR%"
echo アクセスURL: http://localhost
echo 停止するには Ctrl+C を押してください
echo.
python -m http.server 80
pause
goto END

:END
echo.
echo 終了します。
endlocal