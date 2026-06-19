@echo off
title Vendor Comparison - Local Server
cd /d "C:\Users\Shuvendu\vendor-comparison"

echo ============================================
echo   Starting the Vendor Comparison app...
echo   Your browser will open automatically.
echo.
echo   To STOP the app: close this window
echo   (or press Ctrl+C).
echo ============================================
echo.

rem Open the browser after the server has had a few seconds to start
start "" /min cmd /c "timeout /t 8 >nul & start http://localhost:3000"

npm run dev
