# Hetzner Deployment

Hetzner offers affordable Cloud servers and object storage based in Europe. This option is more cost-effective for self-hosted deployments.

## Cheapest viable setup

For a small instance (one artist, a collective, a small label), one cloud
server runs everything. Hetzner changes plan names, prices and availability
often (it repriced several times in 2026, and the cost-optimized plans were
at times not orderable), so this section describes what to pick rather than
quoting prices. Check [hetzner.com/cloud](https://www.hetzner.com/cloud) for
current figures.

**Server: the cheapest plan with 4GB RAM.** Pick from the cost-optimized
x86 or ARM lines if they're available, and the regular shared-vCPU line
otherwise. Mirlo's steady-state footprint is roughly 1–1.5GB:

| Process                    | Rough memory use                                   |
| -------------------------- | -------------------------------------------------- |
| API (also serves the site) | 250–400MB                                          |
| Background worker          | 200–300MB, plus 100–300MB spikes while transcoding |
| PostgreSQL                 | 100–200MB                                          |
| Redis                      | under 50MB                                         |
| Garage (bundled storage)   | 50–100MB                                           |

What sets the 4GB floor is the frontend build, which needs about 3GB.
Add 4GB of swap before installing (see
[Out of memory errors](./troubleshooting.md#out-of-memory-errors)).

ARM servers work in principle: ffmpeg, Sharp, Prisma and all bundled
services have arm64 builds. Mirlo isn't regularly tested on arm64, though,
so check that an upload processes and plays before relying on one.

**CPU:** with two shared vCPUs, transcoding an album takes a few minutes and
competes with the website for CPU. That's fine at small scale. Move to a
bigger plan when uploads become frequent.

**Storage:** start with the bundled Garage store on the server's own disk.
Leave room for the OS, Docker images, the database and the worker's temporary
files, which in practice means audio stops fitting at around half the disk.
After that, switch to [Hetzner Object Storage](#hetzner-cloud-with-docker)
(step 7), which is usually cheaper per GB than attaching a volume once you
have more than about 100GB of audio.

**Bandwidth:** audio streams and downloads go through the server. Cloud
servers in Hetzner's EU locations include a large monthly traffic allowance,
so this is rarely a cost there. US and Singapore locations include much less.

**Also budget for:**

- A public IPv4 address, billed separately from the plan. Don't go IPv6-only:
  Stripe webhooks and many visitors need IPv4.
- Backups. Hetzner's server backups cost a percentage of the server price.
  Also dump the database off the server (`pg_dump` to Object Storage or
  elsewhere), since a disk snapshot isn't a reliable database backup.
- An email provider. See [Email](#email) below.

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
- **Type**: the cheapest plan with 4GB RAM (see [Cheapest viable setup](#cheapest-viable-setup))
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

The bundled Garage store is fine to start with. For production, Hetzner's
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
3. Add the S3 variables to `.env`, remove the `COMPOSE_PROFILES=garage` line
   (it starts the bundled store, which you no longer need), and run
   `docker compose up -d --remove-orphans` to recreate api/background and stop
   the Garage containers:

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

## Email

New Hetzner Cloud accounts have outgoing mail on ports 25 and 465 blocked.
Configure an email provider in the admin settings panel that accepts SMTP on
port 587 or has an API (Mailgun, Postmark, SendGrid and others). Don't try to
send mail directly from the server.

## Hetzner Dedicated Servers

For higher performance, use a dedicated server with bare-metal installation.
Hetzner's main dedicated lines are AX (AMD) and EX (Intel). Even the entry
models have far more capacity than a single Mirlo instance needs. The
[Server Auction](https://www.hetzner.com/sb) sells used dedicated servers
with no setup fee, and is often the cheapest way to get one.

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
the object store (9000 S3 API, 3903 Garage admin API), MailHog (1025/8025)
and the API (3000) — plus PostgreSQL
(5432) and Redis (6379) if you're running the default `docker-compose.yml`
instead of `docker-compose.prod.yml` — are reachable from the internet unless
something outside the host blocks them. Verify from your own machine after attaching the firewall:

```bash
nc -zv -w3 <server-ip> 3903   # should time out
nc -zv -w3 <server-ip> 8025   # should time out
```

To use the blocked admin UIs, tunnel them over SSH instead of opening ports:

```bash
ssh -L 8025:localhost:8025 root@<server-ip>   # MailHog → http://localhost:8025
ssh -L 9000:localhost:9000 root@<server-ip>   # S3 API, for mc/rclone/aws-cli
```

Garage has no web console. To look at stored objects, tunnel the S3 API as
above and point an S3 client at it, or run the Garage CLI directly on the
server with `docker exec blackbird-garage /garage bucket list` — see
[docs/hosting/object-storage.md](object-storage.md#inspecting-storage-in-development).
