# Mirlo self-host on Kubernetes

> CAVEATS:
>
> - this guide assumes familiarity with kubernetes
> - you will need Justfile https://github.com/casey/just

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

Choose a kubernetes namespace to deploy to. We will use `mirlo` in the examples.

In order to customize your deployment, make a sibling copy of the k8s/example folder (i.e. one that lives under the same `k8s` folder), and edit some files from that copy:

- Edit `env.txt` to set environment variables.
- Edit `secrets.txt` to set secrets.
- You may edit `kustomization.yaml` if you want to set a different namespace than `mirlo` (or other customizations, if you are familiar enough with kubernetes and kustomize)

### Deploy

From the repo root directory. We suggest deploying to a namespace e.g. `mirlo`, but you may use another. Open a terminal in the `k8s` folder:

```sh
FOLDER=... # set this to the name of the copy
export NAMESPACE=mirlo
export HOSTNAME=... # the domain you created at the start
export VERSION=... # the version of Mirlo you want to deploy

kubectl create namespace ${NAMESPACE}
./deploy-redis.sh ${NAMESPACE}
kubectl -n ${NAMESPACE} kustomize ${FOLDER} | envsubst | kubectl apply -f -
```

Wait for your pods to start up, your ingress to resolve, your ingress to resolve and letsencrypt to generate a certificate for it...

### Post-deploy

Set up an admin user account. For your convenience, you can run:

```sh
# replace with valid values, of course :)
just admin-user <email> <pass> <name>
```

Register client:

```sh
just register-client
```

Point a web browser to your domain, and a guided setup process will take you through configuring your instance.

> Within the Mirlo admin, you may have to manually delete a client "localhost:8080".

---

# (internal notes - TO BE DELETED)

Follow-up improvements / open questions:

- credentials are stored in the Settings table in plaintext
- figure out whether we need the mounted volumes at all
- email templates don't seem to be customizable?
- Newsletter signup, is this for Mirlo or the instance? should be possible to disable

Other:

- Closed to artist signup not always honored?
- tags not assigned to releases still appear as "popular"
