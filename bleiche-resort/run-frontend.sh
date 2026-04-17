
#!/usr/bin/env bash
set -euo pipefail

# Determine repository root based on this script location.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$script_dir"

# Enter frontend if not already there.
if [[ "$(basename "$PWD")" != "frontend" ]]; then
  cd frontend
fi

printf 'Running in: %s\n' "$PWD"
npm install
npm run dev
