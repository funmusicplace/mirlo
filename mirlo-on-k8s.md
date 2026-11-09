# Mirlo self-host on Kubernetes

To-do list for creating a set of k8s manifests in order to deploy Mirlo.
This is intended as a production-only setup, not for local development.

Things to try out:

- Kompose to convert https://kubernetes.io/docs/tasks/configure-pod-container/translate-compose-kubernetes/

## Plan (changes in Mirlo codebase to allow for self-hostable k8s version)

> (this part is to be removed from the document before merge)

### Generate initial manifests

```
cd k8s
kompose -f ../docker-compose.prod.yml convert
```

...go through them and adjust...

### Build process

- Set up a workflow to ship a Mirlo container image
- Build and ship the right target... `docker build -t prod`
  - maybe add a target `background-prod` for simplicity?
- Build the react client in `client/dist` (into the prod container)

### Infra

Requires a base k8s cluster set up, with cert-manager.

- Sold separately :)

Services that Mirlo relies on:

- Either deploy Redis, Postgres and Garage (S3) to k8s, or use existing infra
- Create manifests for those as self-hosted options (deployment, service, etc)
- Email: set up via Mirlo admin once started

### Env vars

Not all .env.example vars are for production use. Identify those required in prod.
(eg. run generate-env.sh once and see output)

- Identify all environment variables that are not secrets
- Create a ConfigMap for those (simplest option may be a file)
- Identify all those that are secrets and create a secrets.yaml

Plain variables:

```sh
# many variables for domain...
MIRLO_DOMAIN=<domain recorded in DNS>
CLIENT_DOMAIN=${MIRLO_DOMAIN}
VITE_API_DOMAIN=${MIRLO_DOMAIN}
VITE_CLIENT_DOMAIN=${MIRLO_DOMAIN}
STATIC_MEDIA_HOST=${MIRLO_DOMAIN}

NODE_ENV=production
```

Secrets:

```sh
# may use this to generate new secrets
generate_secret() {
  openssl rand -hex 24
}

# internal secrets can be auto-generated
JWT_SECRET=$(generate_secret)
REFRESH_TOKEN_SECRET=$(generate_secret)

# these will depend on how you run infra:
# db
POSTGRES_USER=mirlo
POSTGRES_PASSWORD=$(generate_secret)
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@pgsql:5432/${POSTGRES_USER}?schema=public"
# redis
REDIS_HOST=redis
REDIS_PORT=6379
# may auto-generate if we include redis in k8s
REDIS_PASSWORD=$(generate_secret)
# s3
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=
S3_ENDPOINT=

# optional, proprietary 3rd party services
# turnstile
VITE_CLOUDFLARE_CLIENT_KEY=  # site_key, not secret
CLOUDFLARE_TURNSTILE_API_SECRET=  #not used?
# stripe
STRIPE_KEY=
STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET=
```

### Manifests

From the docker compose files

- Adapt the API into a deployment.yaml
- Adapt the background worker into a worker-deployment.yaml
- Ingress (look at nginx settings in manual installation step 9)
  - cert manager should take care of certificates

---

This part of the documentation will remain, these are the end user instructions

## Do

### Pre-deploy

These instructions assume you have access to a postgres database server and some S3-compatible object storage (those is not set up for you). A Redis instance will be deployed as part of the setup, but you are free to tweak things to use a pre-existing one.

Prep Tasks:

- Set up a domain: Before deploying for the first time, add a DNS record.
- Create a postgres database
- Set up object storage (3 buckets, CORS...).

> In theory, for object storage we may create keys with unlimited access and let Mirlo handle bucket creation, or have limited access keys and pre-create the buckets.
>
> (In practice, however, the latter didn't work for me and had to set up full access keys)

Set env vars and secrets. From the manifests in `/k8s`:

- Edit `env-configmap.yaml`
- Copy `.secrets.example` as `.secrets`, edit its contents.
- Edit `api-ingress.yaml` to replace the host name.

> In a next iteration, we will use `kustomize` or `helm` to make this easier for users to configure without editing the original files.

### Deploy

From the repo root directory. We suggest deploying to a namespace e.g. `mirlo`, but you may use another.

```sh
kubectl create namespace mirlo
k8s/create_secrets.sh mirlo
kubectl -n mirlo apply -f k8s
```

### Post-deploy

> TODO: improve these steps

Set up admin user/pass. For your convenience, you can run:

    just admin-user <email> <pass> <name>

Register client:

    just register client

Point a web browser to your domain, and a guided setup process will take you through configuring your instance.

---

# (internal notes - TO BE DELETED)

Issues:

- Build-time variables (VITE_API_DOMAIN, VITE_CLIENT_DOMAIN and VITE_CLOUDFLARE_CLIENT_KEY) prevent us from having general purpose container. **Suggested fix**: infer the domains at runtime from `window.location.origin` if vars not set. Move the cloudflare site key to a setting. **Workaround**: I built a container that will only work on my domain.
- Images uploaded are not set as acl-public unless I use a full access key (initially I created the buckets manually and added a read/write key to only that small set of buckets for tighter security). **Workaround**: use full access S3 keys (I'd rather not because it exposes buckets from my other apps).
- Turnstile was not working despite env var and secret set via UI. There is a bug where the code in `cloudflare.ts` still relies on the env var and not the setting. **Workaround**: added the env var `CLOUDFLARE_TURNSTILE_API_SECRET`. **Suggested fix**: address the bug in cloudflare.ts by using the setting and not the env var. Use this opportunity to also include the cloudflare site key as a setting rather than a build-time variable

- Stripe: not working despite having all settings and the webhook. Not sure if the code is using the actual settings or env vars, and what has precedence if both exist.

Follow-up improvements:

- instance support section and button showing even if not set up
- favicon is not set to match logo, and can't be set
- Footer references are fixed (e.g about us etc.)
- credentials are stored in the Settings table in plaintext

---

--TODO:
Notes about this setup:

- [ ] figure out whether we need the volumes to be shared across pods, whether they work in a multi-replica situation
- [ ] email templates and URL in signup email not customizable?
