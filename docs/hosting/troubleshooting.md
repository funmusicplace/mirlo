# Troubleshooting

Common problems on self-hosted Mirlo instances. For routine operations
(logs, restarts, updates, backups), see
[Maintenance and Updates](./maintenance.md).

## Service won't start

[Check logs first](./maintenance.md#view-logs).

## Database connection errors

Verify connection string and credentials:

```bash
# Docker - connect to the pgsql container directly
docker compose exec pgsql psql -U mirlo mirlo
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
   docker compose exec pgsql psql "postgresql://mirlo:<password>@localhost:5432/mirlo" -c "select 1"
   ```

   If that fails too, either reset the password in place:

   ```bash
   docker compose exec pgsql psql -U mirlo -d postgres \
     -c "ALTER ROLE mirlo WITH PASSWORD '<password-from-your-env>';"
   ```

   or — **only on a fresh install with nothing in the database** — wipe the
   volume and let it re-initialize from `.env`:

   ```bash
   docker compose down
   rm -rf ./data/pgsql
   docker compose up -d
   docker compose exec api yarn prisma:migrate:deploy
   ```

## File upload failures

Check MinIO is running and has adequate storage:

```bash
# Docker
docker compose ps minio
docker compose exec minio mc admin info local
```

Or check wherever your storage buckets are.

> **First upload to a newly-created bucket gets `403 AccessDenied` (S3-compatible
> providers, e.g. Hetzner Object Storage on Ceph/RadosGW):** Mirlo auto-creates
> buckets on first use (`createBucketIfNotExists` in `src/utils/minio.ts`), and
> on at least one Ceph-backed provider the bucket isn't immediately writable —
> the `CreateBucket` call succeeds but the very next `PutObject` 403s. This is
> propagation lag, not a credentials or token-scope problem. Just retry the
> upload (or the request that triggers it); it succeeds once the bucket has
> propagated, usually within seconds.

> **Track audio upload fails silently in the browser, nothing in the API logs
> past a bucket check:** track audio is uploaded straight from the browser to
> your S3-compatible storage via a presigned URL — the API never sees the file
> bytes, so a failure here won't show up in `docker compose logs api`. Check
> the browser's network tab instead: a CORS error on the `PUT` to your storage
> endpoint means the bucket's CORS configuration hasn't been applied yet.
> Mirlo sets this automatically the same way it does the public-read policy on
> image buckets (`applyCorsPolicyS3` in `src/utils/minio.ts`, run whenever a
> bucket is created or checked at boot) — restarting the api/background
> containers re-runs that check and should resolve it.

## Out of memory errors

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

## Nginx shows its default "Welcome to nginx" page

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

## Redirect loop, or HTTPS redirects to itself

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
