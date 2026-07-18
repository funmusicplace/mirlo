# Maintenance and Updates

Day-2 operations for a self-hosted Mirlo instance. If something's broken,
see [Troubleshooting](./troubleshooting.md).

## View logs:

```bash
docker compose logs -f api
docker compose logs -f background
docker compose logs pgsql | tail -100
```

## Look inside docker

```bash
# Start an interactive shell in the container
docker compose exec api bash
# View a specific file
docker compose exec api cat /path/to/file
```

## Restart services:

```bash
docker compose restart api
docker compose restart background
```

> **Note**: `restart` keeps the container's original environment. If you
> changed `.env`, use `docker compose up -d` instead — it recreates any
> container whose configuration changed. And because the source code is baked
> into the images, code changes (e.g. after `git pull`) need
> `docker compose up -d --build`.

## Update to latest version of Mirlo:

```bash
bash scripts/update.sh
```

This is what the script above does; equivalent manual steps (no separate
migration step — migrations run automatically when the api container boots):

```bash
cd /opt/mirlo
git pull origin main
docker compose build # This step can take a while
docker compose up -d
docker compose exec api yarn client:build
docker compose exec -e MIRLO_DOMAIN=https://yourdomain.com api yarn setup:client
```

The last step backfills the instance's `Client` row for installs that predate
step 7 of the [step-by-step guide](./manual-install.md) — without it, signup
fails with "This client does not exist".

## Backup database:

```bash
docker compose exec pgsql pg_dump -U mirlo mirlo > /backup/mirlo-$(date +%Y%m%d).sql
```

```bash
docker compose exec pgsql pg_dump -U mirlo mirlo | gzip > /backups/mirlo-$(date +%Y%m%d).sql.gz
```

## Restoring from Backup

```bash
# Docker
gunzip < backup.sql.gz | docker compose exec -T pgsql psql -U mirlo mirlo

# Bare-metal
gunzip < backup.sql.gz | sudo -u postgres psql mirlo
```
