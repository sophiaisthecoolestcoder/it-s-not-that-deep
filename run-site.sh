#!/bin/bash
set -e

echo "[Bleiche] Setting up Site (public marketing website)..."

cd site

if [ ! -d "node_modules" ]; then
  echo "[Bleiche] node_modules missing. Running npm install..."
  npm install
else
  echo "[Bleiche] Dependencies present. Run 'npm install' manually if package.json changed."
fi

echo "[Bleiche] Starting Astro dev server on http://localhost:4321"
npm run dev
