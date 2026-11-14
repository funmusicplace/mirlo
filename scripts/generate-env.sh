#!/bin/bash

# Mirlo Environment Setup Script
# Generates .env and client/.env from their examples with randomly generated
# secrets, prompting for the instance domain (like scripts/setup-admin.sh does
# for admin credentials).
#
# Usage:
#   bash scripts/generate-env.sh
#   MIRLO_DOMAIN=https://mirlo.example.com bash scripts/generate-env.sh
#
# Optionally pass S3-compatible object storage credentials (Backblaze B2,
# Hetzner Object Storage, etc.) to skip the bundled Garage store and use them
# instead:
#   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_REGION=... S3_ENDPOINT=... \
#     bash scripts/generate-env.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo ""
echo "📝 Mirlo Environment Setup"
echo ""

# Never overwrite an existing .env: Postgres, Redis and Garage bake their
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

# Public https instances run in production mode (secure + strict auth
# cookies). Plain-http domains (including local dev) stay in development
# mode, because secure cookies are never sent over http and would break
# login entirely.
case "$MIRLO_DOMAIN" in
  https://*) NODE_ENV_VALUE=production ;;
  *) NODE_ENV_VALUE=development ;;
esac

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

# The bundled Garage store only runs under the "garage" compose profile, so
# leave it off when an external S3 service is configured — otherwise it would
# start for nothing and claim host ports 9000/3903.
if [ -n "${S3_ACCESS_KEY_ID:-}" ]; then
  if [ -z "${S3_ENDPOINT:-}" ]; then
    echo "❌ Error: S3_ENDPOINT is required with S3_ACCESS_KEY_ID"
    exit 1
  fi
  COMPOSE_PROFILES_VALUE=
  S3_PUBLIC_ENDPOINT_VALUE=$S3_ENDPOINT
  SERVE_IMAGES_FROM_API_VALUE=false
else
  COMPOSE_PROFILES_VALUE=garage
  S3_ENDPOINT=http://garage:9000
  # Garage wants "GK" + 24 hex chars and a 64 hex char secret.
  S3_ACCESS_KEY_ID=GK$(openssl rand -hex 12)
  S3_SECRET_ACCESS_KEY=$(openssl rand -hex 32)
  # Browsers can only reach Garage in local dev.
  if [ "$MIRLO_DOMAIN" = "http://localhost:3000" ]; then
    S3_PUBLIC_ENDPOINT_VALUE=http://localhost:9000
  else
    S3_PUBLIC_ENDPOINT_VALUE=
  fi
  SERVE_IMAGES_FROM_API_VALUE=true
fi

# Local dev serves the client from its own dev server on :8080; a deployed
# instance serves it from the API.
if [ "$MIRLO_DOMAIN" = "http://localhost:3000" ]; then
  CLIENT_DOMAIN_VALUE=http://localhost:8080
else
  CLIENT_DOMAIN_VALUE=$MIRLO_DOMAIN
fi

# The postgres image names the database after POSTGRES_USER by default, and
# DATABASE_URL is derived from the same values so they can never disagree.
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@pgsql:5432/${POSTGRES_USER}?schema=public"

sed -E \
  -e "s|^NODE_ENV=.*|NODE_ENV=${NODE_ENV_VALUE}|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" \
  -e "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}|" \
  -e "s|^API_DOMAIN=.*|API_DOMAIN=${MIRLO_DOMAIN}|" \
  -e "s|^CLIENT_DOMAIN=.*|CLIENT_DOMAIN=${CLIENT_DOMAIN_VALUE}|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" \
  -e "s|^POSTGRES_USER=.*|POSTGRES_USER=${POSTGRES_USER}|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
  -e "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" \
  -e "s|^COMPOSE_PROFILES=.*|COMPOSE_PROFILES=${COMPOSE_PROFILES_VALUE}|" \
  -e "s|^S3_ENDPOINT=.*|S3_ENDPOINT=${S3_ENDPOINT}|" \
  -e "s|^S3_REGION=.*|S3_REGION=${S3_REGION:-us-east-1}|" \
  -e "s|^S3_ACCESS_KEY_ID=.*|S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}|" \
  -e "s|^S3_SECRET_ACCESS_KEY=.*|S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY:-}|" \
  -e "s|^S3_PUBLIC_ENDPOINT=.*|S3_PUBLIC_ENDPOINT=${S3_PUBLIC_ENDPOINT_VALUE}|" \
  -e "s|^SERVE_IMAGES_FROM_API=.*|SERVE_IMAGES_FROM_API=${SERVE_IMAGES_FROM_API_VALUE}|" \
  .env.example > .env

echo "✓ Wrote .env"
if [ -z "$COMPOSE_PROFILES_VALUE" ]; then
  echo "✓ Configured S3-compatible object storage at ${S3_ENDPOINT}"
fi

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
echo "  Environment:       NODE_ENV=${NODE_ENV_VALUE}"
echo "  Postgres user:     ${POSTGRES_USER}"
echo "  Generated secrets: JWT, refresh token, Postgres, Redis, Garage S3 key"
echo ""
echo "  Keep .env private — it now contains all your credentials."
echo "  Next steps: docker compose -f docker-compose.prod.yml up -d"
