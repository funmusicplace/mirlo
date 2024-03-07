# Mirlo

A RESTful API and client.

Main libraries:

- [Express](https://expressjs.com/)
- [Prisma Client](https://www.prisma.io/docs)

## Contributing

### Download and install

#### For the API:

```sh
git clone <repository>
cd mirlo
cp .env.example .env
docker-compose up # (or depending on your version of docker "docker compose up"--notice the space)
```

Go to `localhost:3000/docs` and see the Swagger API docs.

This should run the **seeding** script by default. If it doesn't do so, you can add run the seed by running:

```sh
docker exec -it blackbird-api npx prisma db seed
```

#### For the client:

```sh
cd client
cp .env.example .env
yarn
yarn start
```

## Email

On production email gets sent by sendgrid. During local development emails appear in the docker logs for the api.

## Background Jobs

### Making changes to background jobs.

Changes in background jobs aren't detected. You'll need to restart the docker container for them:

```sh
docker-compose up -d --force-recreate --no-deps background
```

## Workers (Uploading Music, Images, Etc)

If you want to upload music or upload images, you'll need a worker running.

```sh
docker exec -it blackbird-api node src/jobs/queue-worker.js run
```

> NOTE: this is done automatically by the `blackbird-background` container in docker.

> NOTE: In local development you can see the worker queue at /admin/queues on the server

### Running migrations

Migrations will run automatically on `docker-compose up`. To make changes to the database, change the schema.prisma file and then run:

```sh
docker exec -it blackbird-api npx prisma migrate dev
```

If your typescript for prisma is ever out of date, you can re-generate it with:

```sh
docker exec -it blackbird-api npx prisma generate
```

## Stripe

By default Mirlo uses Stripe as its payment processor.

> NOTE: Every 90 days you'll have to re-log-in to the stripe CLI with `stripe login`

To test webhooks, you'll have to run this:

```sh
stripe listen --forward-to localhost:3000/v1/webhooks/stripe
```

This will forward all stripe webhooks to your localhost:3000, and send them to the checkout/webhook URL. It'll also spit out a `STRIPE_WEBHOOK_SIGNING_SECRET`. You'll need to set that in the .env file.

Then to trigger a specific workflow:

```sh
# this is what's needed to store a subscription
stripe trigger checkout.session.completed --add checkout_session:metadata.userId=3 --add checkout_session:metadata.tierId=2
```

You'll also want fake Stripe data. You can find [the details on that here](https://stripe.com/docs/connect/testing).

## CRON Jobs

Some cron jobs exist:

```sh
docker exec -it blackbird-api yarn ts-node src/jobs/every-minute-tasks.ts
```

## MinIO

You can access dev MinIO at localhost:9001 with the MINIO_ROOT_USER and MINIO_ROOT_PASSWORD you set in .env

## Database

If you want to do logging in the database, you need to uncomment the `log` line in the `prisma/prisma.ts` file.

## Tests

See the [test/README.md](/test/README.md) instructions.

## Apple Chip Errors w/ Docker

If you get errors when running the backbird-api and blackbird-background service like `Error relocating /usr/lib/libgcc_s.so.1: unsupported relocation type 7`, you'll need to follow these steps.

1. In terminal run `softwareupdate --install-rosetta`
2. In Docker Desktop, go to Settings -> General and ensure `Use Rosetta for x86/amd64 emulation on Apple Silicon` is checked.
3. Delete any previously created images
4. Run `DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose up`

## Docker connectivity issues. 

It might be that your docker container can't reach yarn or github. As [described here](https://github.com/moby/moby/issues/32106#issuecomment-382228854): either in Docker Desktop, edit the Docker Engine file to show the DNS, or edit /etc/docker/daemon.json directly:

```
"dns": [
    "10.0.0.2",
    "8.8.8.8"
  ],
```

# Credits

A lot of the code here was originally written for the [Resonate API](https://github.com/resonatecoop/api) and [UI](https://github.com/resonatecoop/beam/)
