# Deploying Mirlo to a VPS

This guide covers deploying Mirlo to a clean Virtual Private Server (VPS). It includes instructions for Docker-based deployments, bare-metal installations, and platform-specific guidance for DigitalOcean.

> **Warning**: At the moment we don't make any guarantees about version, backwards compatability, or anything like that. **You're in charge or your own instance**, and while we'll respond to bugs or issues with the set up, we don't have the resources to help you debug your server setup.

## Architecture Overview

Mirlo consists of several components:

- **API Server** (Node.js/Express) - REST API and frontend
- **Database** (PostgreSQL) - User data, tracks, artists, etc.
- **Queue** (Redis) - Job queue
- **File Storage** (MinIO/Backblaze/Hetzner) - S3-compatible storage for media files
- **Background Worker** (Node.js) - Async job processing (audio conversion, image optimization, email)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS or similar (recommended)
- **RAM**: Minimum 2GB (4GB+ recommended for production)
- **Storage**: 20GB+ free space (more for media files). We recommend setting up with a backblaze account.
- **CPU**: 1+ cores

### Required Tools

- Docker Engine 20.10+
- Docker Compose 2.0+

## General Installation Instructions

Docker deployment is the simplest approach and ensures consistency across environments.

### 1. Initial Setup

> Set up your server however you would normally host. See the instructions in [Hetzner](#option-2a-hetzner-cloud-with-docker-recommended) for specific instructions on a basic installation server.

Connect to your VPS and create a deployment directory:

```bash
ssh root@your-vps-ip
mkdir -p /opt/mirlo
cd /opt/mirlo
```

### 2. Clone the Repository

```bash
git clone https://github.com/funmusicplace/mirlo.git .
```

### 3. Configure Environment Variables

The easiest way is the setup script, which prompts for your instance's public
URL and generates random credentials for PostgreSQL, Redis, MinIO and the JWT
secrets. It writes both `.env` and `client/.env`, with `DATABASE_URL` derived
from the same generated values so they can't disagree:

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
# ⚠️ NODE_ENV also selects the storage backend: "production" makes Mirlo use
# Backblaze/S3, anything else makes it use MinIO. If you're running with
# MinIO, do NOT set NODE_ENV=production — leave it unset (the compose files
# default to "development").
NODE_ENV=production
PORT=3000
API_DOMAIN=https://yourdomain.com
STATIC_MEDIA_HOST=https://yourdomain.com

# Security
JWT_SECRET=your-secure-jwt-secret-here
REFRESH_TOKEN_SECRET=your-secure-refresh-token-secret-here

# Database
DATABASE_URL="postgresql://mirlo_user:secure-password@pgsql:5432/mirlo?schema=public"
POSTGRES_USER=mirlo_user
POSTGRES_PASSWORD=secure-password

# Redis
REDIS_PASSWORD=secure-redis-password

###
# Choose one: MinIO or an S3 Service. S3 Services are recommended in production. https://mirlo.space uses Backblaze as an S3 Service.
###

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure-minio-password

# Backblaze B2 / S3 / Hertzeg Object Storage
S3_ACCESS_KEY_ID=
S3_KEY_NAME=
S3_SECRET_ACCESS_KEY=
S3_REGION=
S3_ENDPOINT=

# Optional: Stripe Integration
STRIPE_KEY=your-stripe-key

```

If configuring manually, also create `client/.env` — the frontend bakes these
values in at build time:

```dotenv
VITE_API_DOMAIN=https://yourdomain.com
VITE_CLIENT_DOMAIN=https://yourdomain.com
```

### 4. Build and Start Services

> **Warning**: make sure `.env` is final before the first start — PostgreSQL
> bakes its credentials into its data volume (`./data/pgsql`) when it first
> initializes, and changing passwords in `.env` afterwards causes
> authentication failures (see
> [Troubleshooting](#database-connection-errors)). Also note that
> `docker compose restart` does **not** re-read `.env`: after any `.env`
> change, run `docker compose up -d` so changed containers get recreated.

```bash
docker compose up -d
```

Verify all services are running:

```bash
docker compose ps
```

You should see 5 services: api, background, pgsql, redis, minio

### 5. Initialize Database

Run migrations on first deployment:

```bash
docker compose exec api yarn prisma:migrate:deploy
```

Optionally seed with demo data:

```bash
docker compose exec api yarn prisma:seed
```

### 5.5. Create Admin User

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

### 6. Build the Client

Build the React frontend for production:

```bash
docker compose exec api yarn client:build
```

This compiles the client code with Vite and places it in the `/client/dist` directory, which Mirlo serves automatically.

On servers with 4GB RAM or less the build can run out of Node heap
(`FATAL ERROR: ... JavaScript heap out of memory`). Give it more headroom
(and consider [adding swap](#out-of-memory-errors)):

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
> and include it in every compose invocation, e.g. by adding
> `COMPOSE_FILE=docker-compose.prod.yml:docker-compose.client.yml` to `.env`.
> Then run the client build once more; from then on it persists on the host.

### 7. Setup Reverse Proxy (Nginx)

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

### 8. Setup SSL Certificate with Let's Encrypt

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

### 9. Verify Deployment

```bash
# Check application health
curl https://yourdomain.com/health

# View API logs
docker compose logs -f api

# View background worker logs
docker compose logs -f background
```

## Maintenance & Updates

### View logs:

```bash
docker compose logs -f api
docker compose logs -f background
docker compose logs pgsql | tail -100
```

### Look inside docker

```bash
# Start an interactive shell in the container
docker compose exec api bash
# View a specific file
docker compose exec api cat /path/to/file
```

### Restart services:

```bash
docker compose restart api
docker compose restart background
```

> **Note**: `restart` keeps the container's original environment. If you
> changed `.env`, use `docker compose up -d` instead — it recreates any
> container whose configuration changed. And because the source code is baked
> into the images, code changes (e.g. after `git pull`) need
> `docker compose up -d --build`.

### Update to latest version of Mirlo:

```bash
cd /opt/mirlo
git pull origin main
docker compose build # This step can take a while
docker compose up -d
docker compose exec api yarn prisma:migrate:deploy
docker compose exec api yarn client:build
```

### Backup database:

```bash
docker compose exec pgsql pg_dump -U mirlo_user mirlo > /backup/mirlo-$(date +%Y%m%d).sql
```

```bash
docker compose exec pgsql pg_dump -U mirlo_user mirlo | gzip > /backups/mirlo-$(date +%Y%m%d).sql.gz
```

### Restoring from Backup

```bash
# Docker
gunzip < backup.sql.gz | docker compose exec -T pgsql psql -U mirlo_user mirlo

# Bare-metal
gunzip < backup.sql.gz | sudo -u postgres psql mirlo
```

---

## Troubleshooting

### Service won't start

[Check logs first](/#view-logs).

### Database connection errors

Verify connection string and credentials:

```bash
# Docker - connect to the pgsql container directly
docker compose exec pgsql psql -U mirlo_user nomads
```

Once connected, you can query the database. Useful commands:

- `\dt` - list all tables
- `SELECT * FROM "User" LIMIT 5;` - query a table
- `\q` - quit

**"Authentication failed against database server"** (Prisma) usually means one
of two things:

1. **The containers are running with stale environment.** `docker compose
restart` does not re-read `.env` — run `docker compose up -d` instead.
   Compare what the app actually sees against your `.env`:

   ```bash
   docker compose exec api printenv DATABASE_URL
   ```

2. **PostgreSQL was first started with different credentials.**
   `POSTGRES_USER`/`POSTGRES_PASSWORD` only take effect when the data volume
   is empty; changing them later does nothing. Test whether the database
   accepts your current password over TCP (the same auth path the app uses):

   ```bash
   docker compose exec pgsql psql "postgresql://mirlo_user:<password>@localhost:5432/mirlo" -c "select 1"
   ```

   If that fails too, either reset the password in place:

   ```bash
   docker compose exec pgsql psql -U mirlo_user -d postgres \
     -c "ALTER ROLE mirlo_user WITH PASSWORD '<password-from-your-env>';"
   ```

   or — **only on a fresh install with nothing in the database** — wipe the
   volume and let it re-initialize from `.env`:

   ```bash
   docker compose down
   rm -rf ./data/pgsql
   docker compose up -d
   docker compose exec api yarn prisma:migrate:deploy
   ```

### File upload failures

Check MinIO is running and has adequate storage:

```bash
# Docker
docker compose ps minio
docker compose exec minio mc admin info local
```

Or check wherever your storage buckets are.

### Out of memory errors

Increase available memory or Node.js heap:

```bash
# Docker - edit docker-compose.api.yml
environment:
  - NODE_OPTIONS=--max-old-space-size=2048
```

Most VPS images ship without swap, which makes memory spikes (like the client
build) fatal instead of just slow. Adding a swapfile is cheap insurance:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Nginx shows its default "Welcome to nginx" page

The request is being answered by nginx's default site because no `server_name`
matched. Check that:

1. `server_name` in your config is your actual domain (not the
   `yourdomain.com` placeholder);
2. the site is enabled: `ls -la /etc/nginx/sites-enabled/` should show the
   `mirlo` symlink;
3. the default site is removed: `rm /etc/nginx/sites-enabled/default`.

Then `nginx -t && systemctl reload nginx`. If certbot ran while the config was
still wrong, re-run it after fixing — it installs the certificate into
whichever server block matches the requested domain.

### Redirect loop, or HTTPS redirects to itself

`curl -sk -D- -o /dev/null https://localhost -H "Host: yourdomain.com"`
on the server tells you which layer is redirecting:

- **The origin returns `301` to its own URL**: a certbot `return 301` (or
  `if ($host = ...)` block) ended up inside the `listen 443 ssl` server block.
  The HTTP→HTTPS redirect must live **only** in the `listen 80` block; the 443
  block should contain only the `proxy_pass` setup and certbot's `ssl_*`
  lines. Find it with `grep -rn "return 301" /etc/nginx/sites-enabled/`.
- **The origin returns `200` but the public URL loops**: your DNS record is
  proxied through Cloudflare (orange cloud) with SSL mode "Flexible" —
  Cloudflare fetches your origin over plain HTTP, hits the HTTP→HTTPS
  redirect, and serves that redirect back on HTTPS, forever. Either switch the
  record to "DNS only" (grey cloud), or set the Cloudflare SSL/TLS mode to
  "Full (strict)" for this hostname.

---

## Hetzner Deployment

Hetzner offers affordable Cloud servers and object storage based in Europe. This option is more cost-effective for self-hosted deployments.

### Hetzner Cloud with Docker

**1. Create a Hetzner Cloud Account**

- Sign up at [hetzner.com/cloud](https://www.hetzner.com/cloud)
- Add a payment method
- Verify your identity
- Create a new project (e.g., "mirlo")

**2. Create a Cloud Server**

In the Hetzner Cloud Console:

- Click "Create Server"
- **Image**: Ubuntu 22.04
- **Type**: CPX22 (2 vCPU, 4GB RAM) - €6.99/month (these numbers likely variable)
- **Location**: Choose closest to your users
- **SSH Key**: Add your public SSH key
- **Volume** (optional): Add 100GB volume for media storage (€.50/month per 10GB, probably different by the time you read this)
- Create the server

**3. Initial Server Setup**

````bash
ssh root@<server-ip>

# Update system
apt-get update && apt-get upgrade -y

# Install Docker (this also installs the Docker Compose v2 plugin —
# don't apt-get install docker-compose, that's the obsolete v1)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install useful tools
apt-get install -y git curl wget nano nginx certbot python3-certbot-nginx

# Add swap — cloud images ship without it, and the client build can
# exhaust 4GB of RAM (see Troubleshooting → Out of memory errors)
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

**4. Mount Storage Volume (if added)**

```bash
# Find the volume
lsblk

# Format and mount
mkfs.ext4 /dev/sdb
mkdir -p /mnt/mirlo-storage
echo '/dev/sdb /mnt/mirlo-storage ext4 defaults 0 0' >> /etc/fstab
mount /mnt/mirlo-storage
chmod 755 /mnt/mirlo-storage
````

**5. Clone and Configure Mirlo**

Follow the instructions in [Initial Setup](#_1-initial-setup).

Configure environment variables (adjust `MEDIA_LOCATION` if using mounted volume):

**6. Start Services**

Use the production Docker Compose file to avoid exposing database/cache ports to the internet:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api yarn prisma:migrate:deploy
```

**Note:** `docker-compose.prod.yml` disables ports on PostgreSQL and Redis to prevent unauthorized access. Only the API (port 3000) is exposed.

**8. Setup Hetzner Object Storage (S3-Compatible)**

For production, use Hetzner's Object Storage instead of MinIO to reduce costs:

1. In Hetzner Console, go to "Storage" → "Object Storage"
2. Create a new Bucket (e.g., "mirlo-media")
3. Create an API Token for the bucket
4. Update `.env` to use S3:

```dotenv
# Use S3 backend instead of MinIO
S3_ACCESS_KEY_ID=your-hetzner-key
S3_SECRET_ACCESS_KEY=your-hetzner-secret
S3_REGION=eu-central-1
S3_ENDPOINT=https://mirlo-media.eu-central-1.linodeobjects.com
```

Alternatively, continue using MinIO for simplicity.

**9. Point Domain to Server**

Add an A record in your domain registrar:

```
A record: yourdomain.com → <server-ip>
A record: www.yourdomain.com → <server-ip>
```

If your DNS is on Cloudflare, either create the record as "DNS only" (grey
cloud), or make sure the zone's SSL/TLS mode is "Full (strict)" — a proxied
record with "Flexible" SSL causes an infinite redirect loop (see
[Troubleshooting](#redirect-loop-or-https-redirects-to-itself)).

**10. Setup Nginx & SSL**

Follow the Nginx setup steps from Option 1, sections 7-8.

### Hetzner Dedicated Servers

For higher performance, use a dedicated server with bare-metal installation:

**Recommended Hetzner Dedicated Servers:**

- **DX12**: 2 cores, 12GB RAM, 500GB SSD (~€30/month)
- **DX22**: 4 cores, 32GB RAM, 2x 1TB SSD (~€60/month)

### Hetzner Firewall & Backup

**Setup Firewall Rules:**

1. In Hetzner Cloud Console, create a new Firewall
2. Add rules:
   - Inbound: Allow SSH (port 22) from your IP
   - Inbound: Allow HTTP (port 80) from 0.0.0.0/0
   - Inbound: Allow HTTPS (port 443) from 0.0.0.0/0
   - Inbound: Deny all other traffic
3. Attach firewall to server

An external (cloud-level) firewall is not optional hardening here: Docker
publishes ports by manipulating iptables directly, **bypassing `ufw`**, so
MinIO (9000/9001), MailHog (1025/8025), the API (3000) and even PostgreSQL's
host port are reachable from the internet unless something outside the host
blocks them. Verify from your own machine after attaching the firewall:

```bash
nc -zv -w3 <server-ip> 9001   # should time out
nc -zv -w3 <server-ip> 8025   # should time out
```

To use the blocked admin UIs, tunnel them over SSH instead of opening ports:

```bash
ssh -L 9001:localhost:9001 root@<server-ip>   # MinIO console → http://localhost:9001
ssh -L 8025:localhost:8025 root@<server-ip>   # MailHog → http://localhost:8025
```

---

## Production Best Practices

1. **Backups**: Automate daily database backups to off-site storage
2. **Monitoring**: Setup alerts for disk space, CPU, memory, and service health
3. **SSL/TLS**: Always use HTTPS with valid certificates (Let's Encrypt recommended)
4. **Firewall**: Restrict access to internal ports (MinIO, Redis, PostgreSQL)
5. **Updates**: Keep OS and dependencies updated regularly
6. **Logging**: Centralize logs using ELK, Syslog, or similar
7. **Rate Limiting**: Configure Nginx rate limiting for API endpoints
8. **Secrets Management**: Use OS-level secret management, never commit to git
9. **Testing**: Test backups and disaster recovery procedures
10. **Documentation**: Document your specific deployment configuration

---

## Getting Help

- [GitHub Issues](https://github.com/funmusicplace/mirlo/issues)
- [Documentation](https://mirlo.space/docs)
- [Render.yaml Reference](../render.yaml)
