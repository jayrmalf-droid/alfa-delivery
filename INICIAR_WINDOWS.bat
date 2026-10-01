@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 24 ou superior e execute este arquivo novamente.
  pause
  exit /b 1
)
node scripts/start-local.mjs
pause
