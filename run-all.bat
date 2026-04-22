@echo off
setlocal

echo [Bleiche] Launching Bleiche Resort ^& Spa development environment...

cd /d "%~dp0"

start "Bleiche Backend"  cmd /k "call run-backend.bat"
timeout /t 2 /nobreak >nul
start "Bleiche Platform" cmd /k "call run-frontend.bat"
timeout /t 2 /nobreak >nul
start "Bleiche Site"     cmd /k "call run-site.bat"

echo.
echo [Bleiche] Three windows opening. URLs ^(give them ~15 seconds to start^):
echo    backend   http://localhost:8000       docs at /docs
echo    platform  http://localhost:3333
echo    site      http://localhost:4321
echo.
endlocal
