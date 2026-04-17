@echo off
setlocal

echo [Bleiche] Setting up Backend...

cd /d "%~dp0backend" || (
  echo [Bleiche] ERROR: backend directory not found.
  exit /b 1
)

set "PY_CMD="
where py >nul 2>nul && set "PY_CMD=py"
if not defined PY_CMD (
  where python >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
  echo [Bleiche] ERROR: Python not found in PATH.
  exit /b 1
)

if not exist "venv" (
  echo [Bleiche] Virtual environment not found. Creating venv...
  %PY_CMD% -m venv venv || exit /b 1
)

if not exist "venv\Scripts\activate.bat" (
  echo [Bleiche] ERROR: venv activation script missing at venv\Scripts\activate.bat
  exit /b 1
)

call "venv\Scripts\activate.bat" || exit /b 1

echo [Bleiche] Installing dependencies...
python -m pip install -q -r requirements.txt || exit /b 1

echo [Bleiche] Running database migrations...
alembic upgrade head || exit /b 1

echo [Bleiche] Starting Backend at http://localhost:8000
echo [Bleiche] API docs at http://localhost:8000/docs
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

endlocal
