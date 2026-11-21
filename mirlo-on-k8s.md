# Mirlo self-host on Kubernetes

## Preparation: infrastructure

Requires a base k8s cluster set up, with cert-manager and nginx-ingress controller.

- Sold separately :)

> https://gitlab.com/txels/kubestrap may be a starting point

Services that Mirlo relies on, not included in the deployment at the moment:

- Postgres: use an external server, or deploy Postgres yourself (not provided)
- S3-compatible storage: use an external service, or just deploy Garage yourself (not provided)
- Email: you will need one of Sendgrid/Mailgun/Postmark or an SMTP-accessible account

Included in the deployment:

- Redis: you may use an external server, or deploy via kubernetes manifests (included here)

### Pre-deploy

These instructions assume you have access to a postgres database server and some S3-compatible object storage (those is not set up for you). A Redis instance will be deployed as part of the setup, but you are free to tweak things to use a pre-existing one.

Prep Tasks:

- Set up a domain: before deploying for the first time, register the domain and create a DNS record to point to the ingress address of your cluster.
- Create a postgres database
- Set up object storage (either manually create the 3 buckets, CORS... or just keys with permissions to create buckets, and Mirlo will handle that).

> In theory, for object storage we may create keys with unlimited access and let Mirlo handle bucket creation, or have limited access keys and pre-create the buckets.
>
> (In practice, however, the latter didn't work for me and had to set up full access keys)

For kubernetes, choose a namespace to deploy to. We will use `mirlo` in the examples.

Set env vars and secrets. From the manifests in `/k8s`:

- Edit `env-configmap.yaml`
- Copy `.secrets.example` as `.secrets.${NAMESPACE}`, edit its contents.
- Edit `api-ingress.yaml` to replace the host name.

> In a next iteration, we will use `kustomize` or `helm` to make this easier for users to configure without editing the original files.

### Deploy

From the repo root directory. We suggest deploying to a namespace e.g. `mirlo`, but you may use another.

```sh
NAMESPACE=mirlo
kubectl create namespace ${NAMESPACE}
k8s/create_secrets.sh ${NAMESPACE}
kubectl -n ${NAMESPACE} apply -f k8s
```

### Post-deploy

Set up admin user/pass. For your convenience, you can run:

    just admin-user <email> <pass> <name>

Register client:

    just register-client

Point a web browser to your domain, and a guided setup process will take you through configuring your instance.

> Within the Mirlo admin, you may have to manually delete a client "localhost:8080".

---

# (internal notes - TO BE DELETED)

Follow-up improvements / open questions:

- instance support section and button showing even if not set up
- credentials are stored in the Settings table in plaintext
- figure out whether we need the mounted volumes at all
- email templates don't seem to be customizable?
