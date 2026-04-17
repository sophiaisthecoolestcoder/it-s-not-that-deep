@echo off
setlocal

echo [Bleiche] Setting up Frontend...

cd /d "%~dp0frontend" || (
  echo [Bleiche] ERROR: frontend directory not found.
  exit /b 1
)

echo [Bleiche] Installing dependencies...
call npm install --quiet || exit /b 1

echo [Bleiche] Starting Frontend at http://localhost:3000
call npm run web

endlocal
