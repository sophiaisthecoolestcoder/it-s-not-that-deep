#!/bin/bash

# Bleiche Development Server Launcher for macOS
# Opens both backend and frontend in separate terminals

echo "🏨 Launching Bleiche Resort & Spa Development Environment..."

# Make scripts executable
chmod +x run-backend.sh
chmod +x run-frontend.sh

# Open backend in new terminal tab
osascript <<EOF
tell app "Terminal"
  do script "cd '$(pwd)' && bash run-backend.sh"
end tell
EOF

sleep 2

# Open frontend in another new terminal tab
osascript <<EOF
tell app "Terminal"
  do script "cd '$(pwd)' && bash run-frontend.sh"
end tell
EOF

echo "✅ Backend and Frontend starting in separate terminal tabs"
echo "⏳ Backend will be ready at http://localhost:8000 (docs at /docs)"
echo "⏳ Frontend will be ready at http://localhost:3000"
