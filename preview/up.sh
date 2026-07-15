#!/usr/bin/env bash
# Bring up (or update) an isolated full-stack preview for the current checkout.
#
#   preview/up.sh <subdomain>
#
# Reachable at https://<subdomain>.preview.mirlo.space once DNS + the caddy proxy
# are set up (see docs/hosting/preview-environments.md). Run from any checkout of
# the branch you want to preview — e.g. a per-PR git worktree.
set -euo pipefail

SUB="${1:?usage: up.sh <subdomain>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f preview/.env.preview ]; then
  echo "preview/.env.preview not found — copy preview/.env.preview.example and edit." >&2
  exit 1
fi

# Shared proxy network (idempotent).
docker network inspect caddy-net >/dev/null 2>&1 || docker network create caddy-net

export PREVIEW_SUBDOMAIN="$SUB"
COMPOSE=(docker compose -p "$SUB" --env-file preview/.env.preview -f docker-compose.preview.yml)

"${COMPOSE[@]}" up -d --build

echo "Waiting for api to become healthy..."
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api yarn ts-node src/healthcheck.ts >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 5
done
if [ -z "${ok:-}" ]; then
  echo "api did not become healthy in time; check: ${COMPOSE[*]} logs api" >&2
  exit 1
fi

# Build the SPA into the container's client/dist, exactly as the hosting guide does
# (docs/hosting/index.md step 6). No VITE_API_DOMAIN is set, so the client calls its
# own origin — same-origin with the API, like production.
echo "Building client..."
"${COMPOSE[@]}" exec -T api yarn client:build

# Seed sandbox data (admin@admin.example / test1234). Safe to re-run.
"${COMPOSE[@]}" exec -T api yarn prisma:seed || true

echo "Preview up: https://${SUB}.preview.mirlo.space"
