#!/bin/bash

# Bleiche Backend Startup Script for macOS
# Run with: bash run-backend.sh

set -e  # Exit on error

echo "🔧 Setting up Bleiche Backend..."

# Navigate to backend directory
cd backend

# Activate virtual environment
if [ -d "venv" ]; then
  source venv/bin/activate
else
  echo "❌ Virtual environment not found. Creating venv..."
  python3 -m venv venv
  source venv/bin/activate
fi

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Run migrations
echo "🗄️  Running database migrations..."
alembic upgrade head

# Start backend
echo "🚀 Starting Bleiche Backend on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
