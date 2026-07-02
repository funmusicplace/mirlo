#!/usr/bin/env bash
# Tear down a preview and delete its data volumes.
#
#   preview/down.sh <subdomain>
set -euo pipefail

SUB="${1:?usage: down.sh <subdomain>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREVIEW_SUBDOMAIN="$SUB" docker compose -p "$SUB" \
  --env-file preview/.env.preview -f docker-compose.preview.yml down -v

echo "Preview torn down: $SUB"
