# Manual Step-by-Step Installation

This is the manual walkthrough of everything the
[Quick Install](./index.md#quick-install-recommended) script
(`scripts/install.sh`) automates — useful if you want to understand or
customize what it's doing, or if you're not using Docker/Ubuntu and need to
adapt the steps.

Docker deployment is the simplest approach and ensures consistency across environments.

## 1. Initial Setup

> Set up your server however you would normally host. See the instructions in [Hetzner Cloud with Docker](./hetzner.md#hetzner-cloud-with-docker) for specific instructions on a basic installation server.

Connect to your VPS and create a deployment directory:

```bash
ssh root@your-vps-ip
mkdir -p /opt/mirlo
cd /opt/mirlo
```

## 2. Clone the Repository

```bash
git clone https://github.com/funmusicplace/mirlo.git .
```

## 3. Configure Environment Variables

The easiest way is the setup script, which prompts for your instance's public
URL and generates random credentials for PostgreSQL, Redis, MinIO and the JWT
secrets. It writes both `.env` and `client/.env`, with `DATABASE_URL` derived
from the same generated values so they can't disagree, and sets
`NODE_ENV=production` for https domains (development otherwise — see the
`NODE_ENV` notes below):

```bash
bash scripts/generate-env.sh
```

Or non-interactively:

```bash
MIRLO_DOMAIN=https://yourdomain.com bash scripts/generate-env.sh
```

Afterwards, open `.env` to fill in anything optional (Stripe keys, S3
credentials if you're not using MinIO, etc.).

> **Note**: the database, Redis and MinIO bake their credentials into their
> data volumes on first start, so run this **before** the first
> `docker compose up`. The script refuses to overwrite an existing `.env` for
> the same reason.

Alternatively, configure it manually:

```bash
cp .env.example .env
nano .env
```

Key variables to set:

```dotenv
# Basic Configuration
# NODE_ENV does NOT choose the storage backend (that's decided by the S3
# variables below). What it does change: with NODE_ENV=production, auth
# cookies are set secure + strict (right for a public https instance, but
# breaks login over plain http), and unconfigured email is silently dropped
# instead of being caught by MailHog (see step 4). The compose files default
# to "development" when it's unset.
NODE_ENV=production
PORT=3000
API_DOMAIN=https://yourdomain.com
STATIC_MEDIA_HOST=https://yourdomain.com

# Security
JWT_SECRET=your-secure-jwt-secret-here
REFRESH_TOKEN_SECRET=your-secure-refresh-token-secret-here

# Database
DATABASE_URL="postgresql://mirlo:secure-password@pgsql:5432/mirlo?schema=public"
POSTGRES_USER=mirlo
POSTGRES_PASSWORD=secure-password

# Redis
REDIS_PASSWORD=secure-redis-password

###
# Choose one: MinIO or an S3 Service. S3 Services are recommended in production. https://mirlo.space uses Backblaze as an S3 Service.
# Mirlo uses the S3 service whenever both S3 credentials below are set, and
# MinIO otherwise (set STORAGE_BACKEND=minio|s3 to override explicitly).
###

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure-minio-password

# Backblaze B2 / S3 / Hetzner Object Storage
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=
S3_ENDPOINT=

# Optional: Stripe Integration
STRIPE_KEY=your-stripe-key
STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET=

```

If configuring manually, also create `client/.env` — the frontend bakes these
values in at build time:

```dotenv
VITE_API_DOMAIN=https://yourdomain.com
VITE_CLIENT_DOMAIN=https://yourdomain.com
```

> **Note**: if you're using Stripe, you'll also need to register two webhook
> endpoints once your domain is live — see
> [Register Stripe Webhooks](./index.md#register-stripe-webhooks). That step
> isn't automated by `install.sh` either.

## 4. Build and Start Services

> **Warning**: make sure `.env` is final before the first start — PostgreSQL
> bakes its credentials into its data volume (`./data/pgsql`) when it first
> initializes, and changing passwords in `.env` afterwards causes
> authentication failures (see
> [Troubleshooting](./troubleshooting.md#database-connection-errors)). Also note that
> `docker compose restart` does **not** re-read `.env`: after any `.env`
> change, run `docker compose up -d` so changed containers get recreated.

For a production server, use the production compose file — the default
`docker-compose.yml` publishes PostgreSQL and Redis on host ports, which on
most VPSes means exposing them to the internet (see
[Hetzner Firewall](./hetzner.md#hetzner-firewall-and-backup)). Add this to
`.env` so every plain `docker compose` command picks it up:

```dotenv
COMPOSE_FILE=docker-compose.prod.yml
```

```bash
docker compose up -d
```

Verify all services are running:

```bash
docker compose ps
```

You should see 6 services: api, background, pgsql, redis, minio, mailhog

MailHog is a dev-only mail catcher. Until you configure a real email provider
(Mailgun, Postmark, or SendGrid) in the admin settings panel, password resets
and other transactional emails go nowhere: with `NODE_ENV=production` they're
silently dropped, and otherwise they land in MailHog's own inbox at
`http://localhost:8025` (see
[Hetzner Firewall](./hetzner.md#hetzner-firewall-and-backup) for how to reach it
over SSH).

## 5. Initialize Database

Migrations run automatically every time the api container boots, so on a
normal install there's nothing to do here. To run them by hand (e.g. to
check they succeeded):

```bash
docker compose exec api yarn prisma:migrate:deploy
```

Optionally seed with demo data:

```bash
docker compose exec api yarn prisma:seed
```

## 6. Create Admin User

Create an initial admin user for deployment management. Run the interactive setup script:

```bash
bash scripts/setup-admin.sh
```

The script will prompt you for:

- **Email address** - Admin email (defaults to `admin@mirlo.local`)
- **Password** - Admin password
- **Name** - Admin display name (defaults to `Administrator`)

Alternatively, if you prefer to pass credentials directly via environment variables:

```bash
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=secure-password ADMIN_NAME="Admin User" docker compose exec api yarn setup:admin
```

This creates (or updates if exists) an admin user with full permissions and a confirmed email address. Credentials can be changed later through the admin panel.

## 7. Register the Instance's Client

The frontend identifies itself to the API as a "client", and user signup
fails with a 400 `This client does not exist` error unless a row matching
your domain exists in the `Client` table. Register it (idempotent, safe to
re-run):

```bash
docker compose exec -e MIRLO_DOMAIN=https://yourdomain.com api yarn setup:client
```

## 8. Build the Client

Build the React frontend for production:

```bash
docker compose exec api yarn client:build
```

This compiles the client code with Vite and places it in the `/client/dist` directory, which Mirlo serves automatically.

On servers with 4GB RAM or less the build can run out of Node heap
(`FATAL ERROR: ... JavaScript heap out of memory`). Give it more headroom
(and consider [adding swap](./troubleshooting.md#out-of-memory-errors)):

```bash
docker compose exec -e NODE_OPTIONS=--max-old-space-size=3072 api yarn client:build
```

> **Warning**: the built files live inside the api **container's** filesystem,
> not on the host. Whenever the api container is recreated (e.g.
> `docker compose up -d` after an `.env` change, or `--build` after a
> `git pull`), the build is lost and the site serves nothing until you re-run
> it. To make builds survive recreates, bind-mount the dist directory: create
> `docker-compose.client.yml`:
>
> ```yaml
> services:
>   api:
>     volumes:
>       - ./client/dist:/var/www/api/client/dist
> ```
>
> and include it in every compose invocation, e.g. by extending the
> `COMPOSE_FILE` line added to `.env` in step 4 to
> `COMPOSE_FILE=docker-compose.prod.yml:docker-compose.client.yml`.
> Then run the client build once more; from then on it persists on the host.

## 9. Setup Reverse Proxy (Nginx)

Mirlo should sit behind a reverse proxy for SSL/TLS and better performance.

Install Nginx:

```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

Create Nginx configuration (HTTP only initially):

```bash
nano /etc/nginx/sites-available/mirlo
```

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;
    listen 80;

    client_max_body_size 5G; # Allow large file uploads

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

Enable the site and test:

```bash
ln -s /etc/nginx/sites-available/mirlo /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

## 10. Setup SSL Certificate with Let's Encrypt

Now that Nginx is running on HTTP, use certbot to generate SSL certificates:

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically:

- Validate your domain ownership via HTTP
- Generate SSL certificates
- Update your Nginx configuration with HTTPS settings
- Setup automatic certificate renewal

Verify the updated configuration:

```bash
nginx -t
systemctl restart nginx
```

## 11. Verify Deployment

```bash
# Check application health
curl https://yourdomain.com/health

# View API logs
docker compose logs -f api

# View background worker logs
docker compose logs -f background
```

That's it! For updates, backups and troubleshooting, see
[Maintenance and Updates](./maintenance.md) in the main hosting
guide.
