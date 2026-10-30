@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo AimEnergy needs Node.js 20 or newer installed.
  echo Install Node.js, then run this launcher again.
  pause
  exit /b 1
)
echo.
echo AimEnergy - Power the right future
echo Open http://127.0.0.1:4173 in your browser.
echo Keep this window open while using the app. Press Ctrl+C to stop.
echo.
node server.mjs
if errorlevel 1 pause
