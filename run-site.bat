@echo off
setlocal

echo [Bleiche] Setting up Site...

cd /d "%~dp0site" || (
  echo [Bleiche] ERROR: site directory not found.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [Bleiche] ERROR: npm not found in PATH. Install Node.js from https://nodejs.org
  exit /b 1
)

if not exist "node_modules" (
  echo [Bleiche] node_modules missing. Running npm install...
  call npm install
  if errorlevel 1 (
    echo [Bleiche] ERROR: npm install failed.
    exit /b 1
  )
) else (
  echo [Bleiche] Dependencies present. Run npm install manually if package.json changed.
)

echo [Bleiche] Starting Astro dev server at http://localhost:4321
call npm run dev
