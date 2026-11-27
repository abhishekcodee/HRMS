@echo off
title HRMS ADMS bridge (keep this window open)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
rem Change the target below if your backend address on Render is different.
:run
node adms-bridge.mjs --port 8888 --target https://hrms-backend-dlez.onrender.com
echo Bridge stopped. Restarting in 10 seconds... (close this window to stop it)
timeout /t 10 >nul
goto run
