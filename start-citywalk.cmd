@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js не найден. Установите его с https://nodejs.org и запустите файл снова.
  pause
  exit /b 1
)
if not exist client\node_modules call npm --prefix client install
call npm --prefix client run build
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000"
node server.cjs
pause
