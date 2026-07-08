#!/bin/bash

# Mirlo Environment Setup Script
# Generates .env and client/.env from their examples with randomly generated
# secrets, prompting for the instance domain (like scripts/setup-admin.sh does
# for admin credentials).
#
# Usage:
#   bash scripts/generate-env.sh
#   MIRLO_DOMAIN=https://mirlo.example.com bash scripts/generate-env.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo ""
echo "📝 Mirlo Environment Setup"
echo ""

# Never overwrite an existing .env: Postgres, Redis and MinIO bake their
# credentials into their data volumes on first start, so regenerating
# passwords after that locks the app out of its own services.
if [ -f .env ]; then
  echo "❌ Error: .env already exists — refusing to overwrite it."
  echo "   If you really want to regenerate it, move it out of the way first:"
  echo "   mv .env .env.bak"
  echo "   (If the services already ran with the old credentials, you'll also"
  echo "   need to reset their data volumes, e.g. ./data/pgsql)"
  exit 1
fi

# Prompt for the public URL of the instance (or take MIRLO_DOMAIN from env)
if [ -z "${MIRLO_DOMAIN:-}" ]; then
  read -p "Public URL of this instance (default: http://localhost:3000 for local dev): " MIRLO_DOMAIN
  MIRLO_DOMAIN=${MIRLO_DOMAIN:-http://localhost:3000}
fi

case "$MIRLO_DOMAIN" in
  http://* | https://*) ;;
  *)
    echo "❌ Error: domain must include the scheme, e.g. https://mirlo.example.com"
    exit 1
    ;;
esac

# Strip any trailing slash
MIRLO_DOMAIN=${MIRLO_DOMAIN%/}

generate_secret() {
  openssl rand -hex 24
}

# Hex secrets are alphanumeric, so they're safe to embed in DATABASE_URL
# without percent-encoding.
JWT_SECRET=$(generate_secret)
REFRESH_TOKEN_SECRET=$(generate_secret)
POSTGRES_USER=mirlo
POSTGRES_PASSWORD=$(generate_secret)
REDIS_PASSWORD=$(generate_secret)
MINIO_ROOT_USER=mirlo
MINIO_ROOT_PASSWORD=$(generate_secret)

# The postgres image names the database after POSTGRES_USER by default, and
# DATABASE_URL is derived from the same values so they can never disagree.
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@pgsql:5432/${POSTGRES_USER}?schema=public"

sed -E \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" \
  -e "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}|" \
  -e "s|^API_DOMAIN=.*|API_DOMAIN=${MIRLO_DOMAIN}|" \
  -e "s|^STATIC_MEDIA_HOST=.*|STATIC_MEDIA_HOST=${MIRLO_DOMAIN}|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" \
  -e "s|^POSTGRES_USER=.*|POSTGRES_USER=${POSTGRES_USER}|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
  -e "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" \
  -e "s|^MINIO_ROOT_USER=.*|MINIO_ROOT_USER=${MINIO_ROOT_USER}|" \
  -e "s|^MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}|" \
  .env.example > .env

echo "✓ Wrote .env"

if [ -f client/.env ]; then
  echo "⚠️  client/.env already exists — leaving it untouched."
elif [ "$MIRLO_DOMAIN" = "http://localhost:3000" ]; then
  # Local dev: the client runs on its own dev server, the example defaults
  # (API on :3000, client on :8080) are already correct.
  cp client/.env.example client/.env
  echo "✓ Wrote client/.env (local dev defaults)"
else
  # Deployed instance: the API serves the built client, so both point at the
  # same public URL.
  sed -E \
    -e "s|^VITE_API_DOMAIN=.*|VITE_API_DOMAIN=${MIRLO_DOMAIN}|" \
    -e "s|^VITE_CLIENT_DOMAIN=.*|VITE_CLIENT_DOMAIN=${MIRLO_DOMAIN}|" \
    client/.env.example > client/.env
  echo "✓ Wrote client/.env"
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "  Instance URL:      ${MIRLO_DOMAIN}"
echo "  Postgres user:     ${POSTGRES_USER}"
echo "  Generated secrets: JWT, refresh token, Postgres, Redis, MinIO"
echo ""
echo "  Keep .env private — it now contains all your credentials."
echo "  Next steps: docker compose -f docker-compose.prod.yml up -d"
