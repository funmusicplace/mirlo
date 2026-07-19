# Deploying Mirlo to a VPS

This guide covers deploying Mirlo to a clean Virtual Private Server (VPS).
This page has the recommended quick install and the Stripe webhook setup.
Related pages:

- [Manual Step-by-Step Installation](./manual-install.md) — the manual
  walkthrough of everything the install script automates
- [Hetzner Deployment](./hetzner.md) — platform-specific walkthrough for
  Hetzner Cloud servers and object storage
- [Maintenance and Updates](./maintenance.md) — logs, restarts, updating,
  backups and restores
- [Troubleshooting](./troubleshooting.md) — common problems and fixes
- [Object storage & buckets](./object-storage.md) — how Mirlo lays out its
  media storage

> **Warning**: At the moment we don't make any guarantees about version, backwards compatability, or anything like that. **You're in charge or your own instance**, and while we'll respond to bugs or issues with the set up, we don't have the resources to help you debug your server setup.

## Architecture Overview

Mirlo consists of several components. We use Docker to orchestrate these:

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
- Git

(nginx and certbot are also needed for public https domains, but the install
script installs those on apt-based systems.)

## Quick Install (recommended)

Before anything else, point your domain's DNS A record at the server — the
SSL certificate step validates the domain over HTTP, so it should resolve to
this server before you install (see the DNS and Cloudflare notes in
[Hetzner Cloud with Docker](./hetzner.md#hetzner-cloud-with-docker)).

On a fresh Ubuntu server, install Docker and git, then clone the repo to
`/opt/mirlo`:

```bash
# Installs Docker Engine including the Docker Compose v2 plugin
curl -fsSL https://get.docker.com | sh

apt-get install -y git
mkdir -p /opt/mirlo && cd /opt/mirlo
git clone https://github.com/funmusicplace/mirlo.git .
```

From there, `scripts/install.sh` does everything in the
[step-by-step guide](./manual-install.md) (env generation, compose config,
build + start, admin user, client registration, frontend build, and nginx +
Let's Encrypt for public https domains) in one unattended run. Run it as
root for public https domains — it installs nginx and certbot itself (via
apt) if they're missing; on non-apt distros, install those two manually
first:

```bash
cd /opt/mirlo
bash scripts/install.sh
```

Or non-interactively:

```bash
MIRLO_DOMAIN=https://yourdomain.com \
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secure-password \
bash scripts/install.sh
```

It's safe to re-run: existing `.env` / compose config / admin user are
reused or updated, so a failed step (e.g. certbot before DNS propagated) can
be fixed and retried by running the script again.

### Updating

To update an existing instance later:

```bash
bash scripts/update.sh
```

This pulls latest, rebuilds the images, restarts, and rebuilds the frontend
(migrations run automatically on API boot — no separate migration step). See
[Maintenance and Updates](./maintenance.md) for the equivalent manual steps,
plus logs, backups and restores.

The [step-by-step guide](./manual-install.md) is what `install.sh` automates
— useful if you want to understand or customize what it's doing, or if
you're not using Docker/Ubuntu and need to adapt the steps.

> **Note**: for now you'll still need to do the Stripe set up steps described
> in [Register Stripe Webhooks](#register-stripe-webhooks) below.

## Register Stripe Webhooks

If you're using Stripe, Mirlo needs a webhook endpoint registered against
**your platform's Stripe account** (not per connected artist account — this is
a one-time setup for the whole instance). There's currently no way to do this
from Mirlo itself, so it has to be done by hand in the
[Stripe Dashboard](https://dashboard.stripe.com/webhooks) under **Developers →
Webhooks**, once your domain is live.

Create **`https://yourdomain.com/v1/webhooks/stripe/connect`** — all of
Mirlo's payment activity happens on connected accounts, and this endpoint is
what keeps subscriptions, purchases and payouts in sync. When creating it,
set "Listen to events on Connected accounts" and select at least:

- `checkout.session.completed`
- `setup_intent.succeeded`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.deleted`
- `account.updated`
- `terminal.reader.action_succeeded`
- `terminal.reader.action_failed`

After creating the endpoint, Stripe reveals a **signing secret** (starts with
`whsec_`) — copy it into `.env` as `STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET`,
then recreate the api container so it picks up the change (`docker compose up
-d`).

> Note: We will hopefully automate this in the future but you do need to do this if you want to receive Stripe payments.

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
- [Render.yaml Reference](https://github.com/funmusicplace/mirlo/blob/main/render.yaml)
