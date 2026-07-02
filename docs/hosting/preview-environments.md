# Preview environments

Full-stack, per-branch preview environments on a single self-hosted server. Each
open PR (with the `preview` label) gets its own isolated copy of the whole Mirlo
stack at `https://<preview>.preview.mirlo.space`, so maintainers can click through
front-end **and** back-end changes before merging.

This runs the real `docker compose` stack — the same way you'd self-host Mirlo — so
it doubles as a live check that the deployment path works.

## How it works

- Each preview is one Compose project (`docker compose -p pr-123 …`), which
  namespaces its containers, network, and volumes. Previews are fully isolated:
  their own Postgres, Redis, MinIO, and a freshly seeded database — no shared
  state, no production data.
- The `api` container serves both the built SPA and the API, so a preview is
  **same-origin** (like production). Login and everything else works with no CORS,
  cookie, or API-key special-casing. As in the main [hosting guide](./index.md),
  the SPA is built at runtime inside the container (`yarn client:build`) with no
  `VITE_API_DOMAIN`, so it calls its own origin.
- A single long-lived [Caddy](https://caddyserver.com/) reverse proxy fronts every
  preview. Each preview's `api` joins a shared `caddy-net` network with a network
  alias equal to its subdomain, and Caddy routes `<sub>.preview.mirlo.space` to it.
  No per-preview proxy config.

It reuses the standard `api`/`background` [Dockerfile](../../Dockerfile) targets —
no preview-specific image. Files:
[`docker-compose.preview.yml`](../../docker-compose.preview.yml) and the
[`preview/`](../../preview/) directory (proxy, env template, scripts).

## Cost & sizing

One fixed-cost VPS (e.g. Hetzner). Fully isolated previews need ~2–3 GB RAM each,
so size the box for the concurrency you want — a ~8 GB box comfortably runs ~3–4 at
once. Preview MinIO needs almost no disk (a few test uploads).

## One-time host setup

On a fresh box (Docker + Compose installed):

1. **DNS.** Point a wildcard at the box (proxied or DNS-only, your choice):
   ```
   *.preview.mirlo.space  A  <box-ip>
   ```
2. **Clone** the repo to `/opt/mirlo`.
3. **Env.** Copy the template and review it (it's a sandbox — the defaults are
   throwaway, not production secrets):
   ```bash
   cp preview/.env.preview.example preview/.env.preview
   ```
4. **Proxy network + Caddy** (long-lived, fronts all previews):
   ```bash
   docker network create caddy-net
   cd preview
   # Cloudflare API token scoped to edit DNS on the mirlo.space zone (for the
   # wildcard TLS cert). Put ACME_EMAIL + CLOUDFLARE_API_TOKEN in .env.caddy:
   docker compose --env-file .env.caddy -f docker-compose.caddy.yml up -d --build
   ```

## CI wiring (automatic per-PR)

The [`preview` workflow](../../.github/workflows/preview.yml) brings previews up on
PRs labeled `preview`, and tears them down when the PR closes. Add repo secrets:

- `PREVIEW_SSH_HOST`, `PREVIEW_SSH_USER`, `PREVIEW_SSH_KEY` — SSH access to the box.

**Security:** previews build and run PR code on the box, so the workflow only runs
for **same-repo** branches, never forks, and only when a maintainer applies the
`preview` label. Keep it that way.

## Manual use

From a checkout of the branch on the box:

```bash
preview/up.sh my-preview      # build + start, seed sandbox data
preview/down.sh my-preview    # stop + delete volumes
```

Then open `https://my-preview.preview.mirlo.space` and log in with the seeded
account (`admin@admin.example` / `test1234`).

## Limitations

- **Sandbox only.** Each preview has its own empty-then-seeded database. It is not
  a copy of production data.
- **Payments/email are inert** unless you fill in `STRIPE_KEY` and a mail
  transport in `preview/.env.preview`.
- **Concurrency is RAM-bounded** by the box — a hard ceiling, unlike autoscaling
  cloud previews.
