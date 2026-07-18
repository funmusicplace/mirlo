# Hetzner Deployment

Hetzner offers affordable Cloud servers and object storage based in Europe. This option is more cost-effective for self-hosted deployments.

## Hetzner Cloud with Docker

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

```bash
ssh root@<server-ip>

apt-get update && apt-get upgrade -y

# Install Docker (this also installs the Docker Compose v2 plugin —
# don't apt-get install docker-compose, that's the obsolete v1)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

apt-get install -y git
```

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
```

**5. Point Domain to Server**

Add an A record in your domain registrar (do this before installing, so
certbot's domain validation succeeds on the first try):

```
A record: yourdomain.com → <server-ip>
A record: www.yourdomain.com → <server-ip>
```

If your DNS is on Cloudflare, either create the record as "DNS only" (grey
cloud), or make sure the zone's SSL/TLS mode is "Full (strict)" — a proxied
record with "Flexible" SSL causes an infinite redirect loop (see
[Troubleshooting](./troubleshooting.md#redirect-loop-or-https-redirects-to-itself)).

**6. Clone and Install**

```bash
mkdir -p /opt/mirlo && cd /opt/mirlo
git clone https://github.com/funmusicplace/mirlo.git .
bash scripts/install.sh
```

This is the [Quick Install](./index.md#quick-install-recommended) from the
main hosting guide — it warns if the server has no swap (add it first on
servers with 4GB RAM or less, see
[Out of memory errors](./troubleshooting.md#out-of-memory-errors)), generates `.env`,
builds and starts everything with `docker-compose.prod.yml` (no exposed
database/cache ports), creates the admin user, registers the instance's
client, builds the frontend, and configures nginx + Let's Encrypt against
the domain you point it at.

**7. Setup Hetzner Object Storage (S3-Compatible), optional**

MinIO (bundled by default) is fine to start with. For production, Hetzner's
Object Storage reduces costs. Mirlo creates its own buckets on first use
(named `mirlo-audio`, `mirlo-images`, `mirlo-downloads`, or prefixed per your
`bucketNames` setting — see
[docs/hosting/object-storage.md](object-storage.md)), including the
public-read and CORS policies each bucket needs (providers create buckets
private with no CORS by default) — so there's no bucket to create or
configure by hand, just an API token with bucket-creation permission. You can
either enter these values at the `install.sh` storage prompt or set them
directly in `.env`:

1. In Hetzner Console, go to "Storage" → "Object Storage"
2. Create an API Token (project-level, not scoped to a single bucket, since it needs to create one)
3. Add the S3 variables to `.env` and recreate the api/background containers:

```dotenv
S3_ACCESS_KEY_ID=your-hetzner-key
S3_SECRET_ACCESS_KEY=your-hetzner-secret
# Region matches whichever location you picked for the Object Storage
# instance in the console: nbg1 (Nuremberg), fsn1 (Falkenstein), hel1 (Helsinki)
S3_REGION=fsn1
S3_ENDPOINT=https://fsn1.your-objectstorage.com
```

```bash
docker compose up -d
```

## Hetzner Dedicated Servers

For higher performance, use a dedicated server with bare-metal installation:

**Recommended Hetzner Dedicated Servers:**

- **DX12**: 2 cores, 12GB RAM, 500GB SSD (~€30/month)
- **DX22**: 4 cores, 32GB RAM, 2x 1TB SSD (~€60/month)

## Hetzner Firewall and Backup

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
MinIO (9000/9001), MailHog (1025/8025) and the API (3000) — plus PostgreSQL
(5432) and Redis (6379) if you're running the default `docker-compose.yml`
instead of `docker-compose.prod.yml` — are reachable from the internet unless
something outside the host blocks them. Verify from your own machine after attaching the firewall:

```bash
nc -zv -w3 <server-ip> 9001   # should time out
nc -zv -w3 <server-ip> 8025   # should time out
```

To use the blocked admin UIs, tunnel them over SSH instead of opening ports:

```bash
ssh -L 9001:localhost:9001 root@<server-ip>   # MinIO console → http://localhost:9001
ssh -L 8025:localhost:8025 root@<server-ip>   # MailHog → http://localhost:8025
```
