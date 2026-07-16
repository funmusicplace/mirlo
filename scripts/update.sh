#!/bin/bash

# Mirlo update script: pull the latest code, rebuild, restart and rebuild the
# frontend. Database migrations run automatically when the api container
# boots, so there is no separate migration step.
#
# Usage: bash scripts/update.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo ""
echo "🐤 Updating Mirlo"
echo ""

git pull origin main

# Source code is baked into the images, so a rebuild is required.
docker compose build
docker compose up -d

echo "Waiting for the API to come back up (migrations run on boot)..."
for i in $(seq 1 60); do
  if curl -fsS http://localhost:3000/health > /dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "❌ Error: the API did not become healthy within 5 minutes."
    echo "   Check the logs: docker compose logs api"
    exit 1
  fi
  sleep 5
done

docker compose exec -T -e NODE_OPTIONS=--max-old-space-size=3072 api yarn client:build

echo ""
echo "✓ Update complete and API healthy."
