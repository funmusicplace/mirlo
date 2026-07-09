#!/bin/bash

# Mirlo one-shot VPS installer.
#
# Collects everything it needs up front (instance domain, admin credentials),
# then runs the whole installation unattended:
#
#   1. generates .env with random credentials (scripts/generate-env.sh)
#   2. configures docker compose for production + persistent client builds
#   3. builds and starts all services (database migrations run automatically
#      when the api container boots)
#   4. creates the admin user
#   5. builds the frontend
#   6. for public https domains: configures nginx and a Let's Encrypt
#      certificate (the admin email doubles as the Let's Encrypt contact)
#   7. finishes with a health check
#
# Usage (interactive):
#   bash scripts/install.sh
#
# Usage (non-interactive):
#   MIRLO_DOMAIN=https://mirlo.example.com \
#   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... bash scripts/install.sh
#
# To use S3-compatible object storage (Backblaze B2, Hetzner Object Storage,
# etc.) instead of bundled MinIO, either answer "y" at the storage prompt, or
# pass credentials up front (also skips the prompt):
#   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
#   S3_REGION=fsn1 S3_ENDPOINT=https://fsn1.your-objectstorage.com \
#   MIRLO_DOMAIN=https://mirlo.example.com \
#   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... bash scripts/install.sh
#
# Re-running is safe: existing .env / compose config / admin user are reused
# or updated, so a failed step (e.g. certbot before DNS propagated) can be
# retried by running the script again.

set -euo pipefail

cd "$(dirname "$0")/.."

step() {
  echo ""
  echo "▶ $1"
  echo ""
}

echo ""
echo "🐤 Mirlo installer"

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

if ! command -v docker > /dev/null; then
  echo "❌ Error: docker is not installed."
  echo "   Install it first, e.g.:"
  echo "   curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
  echo "❌ Error: the Docker Compose v2 plugin is missing."
  echo "   (apt-get install docker-compose gives you the obsolete v1 — install"
  echo "   Docker via https://get.docker.com instead, which includes v2.)"
  exit 1
fi

# The client build needs ~3GB of memory; without swap it dies on small VPSes,
# including 4GB boxes (observed via oom-killer on a stock 4GB Hetzner CPX).
total_swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
if [ "$total_swap_kb" -eq 0 ]; then
  echo ""
  echo "⚠️  This server has no swap. The frontend build may run out of memory"
  echo "   and be silently killed by the OOM killer partway through this"
  echo "   script. Consider adding swap first:"
  echo "   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
  echo "   echo '/swapfile none swap sw 0 0' >> /etc/fstab"
fi

# ---------------------------------------------------------------------------
# Gather all input up front
# ---------------------------------------------------------------------------

# If .env already exists (e.g. a previous run), reuse its domain instead of
# prompting — generate-env.sh refuses to overwrite it anyway.
if [ -f .env ] && [ -z "${MIRLO_DOMAIN:-}" ]; then
  MIRLO_DOMAIN=$(grep -E "^API_DOMAIN=" .env | head -1 | cut -d= -f2- | tr -d "'\"")
  echo ""
  echo "ℹ️  Found existing .env — using its domain: ${MIRLO_DOMAIN}"
fi

if [ -z "${MIRLO_DOMAIN:-}" ]; then
  read -p "Public URL of this instance (e.g. https://mirlo.example.com): " MIRLO_DOMAIN
fi

case "$MIRLO_DOMAIN" in
  http://* | https://*) ;;
  *)
    echo "❌ Error: domain must include the scheme, e.g. https://mirlo.example.com"
    exit 1
    ;;
esac
MIRLO_DOMAIN=${MIRLO_DOMAIN%/}
DOMAIN_HOST=${MIRLO_DOMAIN#*://}

# Public https domain → we'll also set up nginx + Let's Encrypt, which needs
# root and a DNS record already pointing at this server.
SETUP_NGINX=false
case "$MIRLO_DOMAIN" in
  https://*) SETUP_NGINX=true ;;
esac

if [ "$SETUP_NGINX" = true ] && [ "$(id -u)" -ne 0 ]; then
  echo "❌ Error: setting up nginx and the SSL certificate requires root."
  echo "   Re-run as root (or with sudo)."
  exit 1
fi

if [ -z "${ADMIN_EMAIL:-}" ]; then
  read -p "Admin email address (also used for the SSL certificate): " ADMIN_EMAIL
fi
if [ -z "$ADMIN_EMAIL" ]; then
  echo "❌ Error: admin email cannot be empty"
  exit 1
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  read -sp "Admin password: " ADMIN_PASSWORD
  echo ""
  read -sp "Confirm admin password: " password_confirm
  echo ""
  if [ "$ADMIN_PASSWORD" != "$password_confirm" ]; then
    echo "❌ Error: passwords do not match"
    exit 1
  fi
fi
if [ -z "$ADMIN_PASSWORD" ]; then
  echo "❌ Error: password cannot be empty"
  exit 1
fi

if [ -z "${ADMIN_NAME:-}" ]; then
  read -p "Admin name (default: Administrator): " ADMIN_NAME
  ADMIN_NAME=${ADMIN_NAME:-Administrator}
fi

# Object storage: MinIO (bundled) or an S3-compatible service (Backblaze B2,
# Hetzner Object Storage, etc.) — only asked if .env doesn't exist yet, since
# it's only used the first time generate-env.sh writes .env.
if [ ! -f .env ] && [ -z "${S3_ACCESS_KEY_ID:-}" ]; then
  read -p "Use an S3-compatible object storage service instead of bundled MinIO? (y/N): " USE_S3
  case "$USE_S3" in
    y | Y | yes | Yes)
      echo "Create an access key/token for your bucket in your storage"
      echo "provider's console first (e.g. Hetzner Cloud Console → Object"
      echo "Storage → generate credentials), then paste the values here."
      read -p "S3 access key ID: " S3_ACCESS_KEY_ID
      read -sp "S3 secret access key: " S3_SECRET_ACCESS_KEY
      echo ""
      read -p "S3 region (e.g. fsn1, nbg1, hel1 for Hetzner): " S3_REGION
      read -p "S3 endpoint (e.g. https://fsn1.your-objectstorage.com): " S3_ENDPOINT
      ;;
  esac
fi

# ---------------------------------------------------------------------------
# 1. Environment
# ---------------------------------------------------------------------------

step "Configuring environment"

if [ -f .env ]; then
  echo "ℹ️  .env already exists — keeping it."
else
  MIRLO_DOMAIN="$MIRLO_DOMAIN" \
    S3_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-}" \
    S3_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-}" \
    S3_REGION="${S3_REGION:-}" \
    S3_ENDPOINT="${S3_ENDPOINT:-}" \
    bash scripts/generate-env.sh
fi

# ---------------------------------------------------------------------------
# 2. Compose configuration
# ---------------------------------------------------------------------------

step "Configuring docker compose"

# Bind-mount the built client onto the host so it survives container
# recreation (otherwise the build lives only in the container filesystem and
# disappears whenever the container is recreated).
if [ ! -f docker-compose.client.yml ]; then
  cat > docker-compose.client.yml << 'EOF'
services:
  api:
    volumes:
      - ./client/dist:/var/www/api/client/dist
EOF
  echo "✓ Wrote docker-compose.client.yml"
fi

# Make every plain `docker compose` command use the production compose file
# (no public PostgreSQL/Redis ports) plus the client bind mount.
if ! grep -q "^COMPOSE_FILE=" .env; then
  echo "" >> .env
  echo "COMPOSE_FILE=docker-compose.prod.yml:docker-compose.client.yml" >> .env
  echo "✓ Set COMPOSE_FILE in .env"
fi

# ---------------------------------------------------------------------------
# 3. Build and start services
# ---------------------------------------------------------------------------

step "Building and starting services (the first build can take a while)"

docker compose up -d

echo "Waiting for the API to come up (migrations run on first boot)..."
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
echo "✓ API is healthy"

# ---------------------------------------------------------------------------
# 4. Admin user
# ---------------------------------------------------------------------------

step "Creating admin user"

docker compose exec -T \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_NAME="$ADMIN_NAME" \
  api yarn setup:admin

# ---------------------------------------------------------------------------
# 5. Frontend build
# ---------------------------------------------------------------------------

step "Building the frontend (this also takes a while)"

if ! docker compose exec -T -e NODE_OPTIONS=--max-old-space-size=3072 api yarn client:build; then
  echo ""
  echo "❌ Error: the frontend build failed. On low-memory servers this is"
  echo "   usually the OOM killer — check: dmesg | grep -i oom"
  echo "   If so, add swap and re-run this script (it's safe to re-run):"
  echo "   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
  echo "   echo '/swapfile none swap sw 0 0' >> /etc/fstab"
  exit 1
fi

# ---------------------------------------------------------------------------
# 6. Nginx + Let's Encrypt (public domains only)
# ---------------------------------------------------------------------------

if [ "$SETUP_NGINX" = true ]; then
  step "Setting up nginx and SSL for ${DOMAIN_HOST}"

  if ! command -v nginx > /dev/null || ! command -v certbot > /dev/null; then
    if command -v apt-get > /dev/null; then
      apt-get update
      apt-get install -y nginx certbot python3-certbot-nginx
    else
      echo "❌ Error: nginx and/or certbot are missing and this system doesn't"
      echo "   use apt. Install them manually, then re-run this script."
      exit 1
    fi
  fi

  cat > /etc/nginx/sites-available/mirlo << EOF
server {
    server_name ${DOMAIN_HOST};
    listen 80;

    client_max_body_size 5G; # Allow large file uploads

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/mirlo /etc/nginx/sites-enabled/mirlo
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
  echo "✓ nginx configured"

  # Certbot validates the domain over HTTP, installs the certificate and adds
  # the HTTPS server block + redirect to the nginx config.
  if certbot --nginx --non-interactive --agree-tos --redirect \
    -m "$ADMIN_EMAIL" -d "$DOMAIN_HOST"; then
    echo "✓ SSL certificate installed"
  else
    echo ""
    echo "⚠️  certbot failed — most often the DNS record for ${DOMAIN_HOST}"
    echo "   doesn't point at this server yet. The site is still reachable"
    echo "   over plain HTTP. Once DNS is fixed, re-run:"
    echo "   certbot --nginx --agree-tos -m ${ADMIN_EMAIL} -d ${DOMAIN_HOST} --redirect"
  fi
fi

# ---------------------------------------------------------------------------
# 7. Health check
# ---------------------------------------------------------------------------

step "Final health check"

if curl -fsS "${MIRLO_DOMAIN}/health" > /dev/null 2>&1; then
  HEALTH_MSG="✓ ${MIRLO_DOMAIN}/health is responding"
elif curl -fsS "http://localhost:3000/health" > /dev/null 2>&1; then
  HEALTH_MSG="⚠️  The API is healthy locally, but ${MIRLO_DOMAIN}/health isn't
   reachable (yet) — check your DNS record and the certbot output above."
else
  HEALTH_MSG="❌ The API is not responding — check: docker compose logs api"
fi
echo "$HEALTH_MSG"

echo ""
echo "✓ Installation finished!"
echo ""
echo "  Instance:  ${MIRLO_DOMAIN}"
echo "  Admin:     ${ADMIN_EMAIL}"
echo ""
echo "  Next steps:"
echo "  - Log in and configure an email provider and your Stripe secret key"
echo "    in the admin settings (these live in the database, not in .env)."
echo "  - Set up a cloud-level firewall: Docker bypasses ufw, so only ports"
echo "    22, 80 and 443 should be open from the internet (see the hosting"
echo "    docs, docs/hosting/index.md)."
echo "  - To update later: bash scripts/update.sh"
