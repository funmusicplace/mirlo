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
docker-compose up
```

Go to `localhost:3000/docs` and see the Swagger API docs.

This should run the **seeding** script by default. If it doesn't do so, you can add run the seed by running:

```sh
docker exec -it blackbird-api npx prisma db seed
```

#### For the client:

```sh
cd client
yarn
yarn start
```

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

## Stripe

By default Mirlo uses Stripe as its payment processor.

> NOTE: Every 90 days you'll have to re-log-in to the stripe CLI with `stripe login`

To test webhooks, you'll have to run this:

```sh
stripe listen --forward-to localhost:3000/v1/checkout/webhook
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
docker exec -it blackbird-api yarn ts-node src/jobs/announce-post-published.ts
```

## MinIO

You can access dev MinIO at localhost:9001 with the MINIO_ROOT_USER and MINIO_ROOT_PASSWORD you set in .env

## Database

If you want to do logging in the database, you need to uncomment the `log` line in the `prisma/prisma.ts` file.

# Credits

Logo created by Lluisa Iborra on [the Noun Project](https://thenounproject.com/icon/bird-818956/).

A lot of the code here was originally written for the [Resonate API](https://github.com/resonatecoop/api) and [UI](https://github.com/resonatecoop/beam/)
