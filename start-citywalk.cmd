@echo off
cd /d "%~dp0"
rem Закрываем только старый CityWalk на его выделенном порту, чтобы не запускалась устаревшая версия API.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$connections = Get-NetTCPConnection -LocalPort 8010 -State Listen -ErrorAction SilentlyContinue; $connections | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js не найден. Установите его с https://nodejs.org и запустите файл снова.
  pause
  exit /b 1
)
if not exist client\node_modules call npm --prefix client install
call npm --prefix client run build
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8010"
node server.cjs
pause
