#!/bin/bash

# Bleiche Frontend Startup Script for macOS
# Run with: bash run-frontend.sh

set -e  # Exit on error

echo "🎨 Setting up Bleiche Frontend..."

# Navigate to frontend directory
cd frontend

# Install/update npm dependencies
echo "📦 Installing dependencies..."
npm install --quiet

# Start frontend
echo "🚀 Starting Bleiche Frontend on http://localhost:3000"
npm run web
