#!/bin/bash

# Bleiche development launcher — macOS.
# Opens three Terminal tabs: backend, platform frontend, public site.

echo "🏨 Launching Bleiche Resort & Spa development environment..."

chmod +x run-backend.sh run-frontend.sh run-site.sh

# Backend
osascript <<EOF
tell app "Terminal"
  do script "cd '$(pwd)' && bash run-backend.sh"
end tell
EOF
sleep 2

# Platform frontend (React Native Web)
osascript <<EOF
tell app "Terminal"
  do script "cd '$(pwd)' && bash run-frontend.sh"
end tell
EOF
sleep 2

# Public marketing site (Astro)
osascript <<EOF
tell app "Terminal"
  do script "cd '$(pwd)' && bash run-site.sh"
end tell
EOF

echo
echo "✅ Three terminals opening. URLs (give them ~15 seconds to start):"
echo "   backend   http://localhost:8000       (docs at /docs)"
echo "   platform  http://localhost:3333"
echo "   site      http://localhost:4321"
