# Blackbird

A RESTful API and client.

Main libraries:

- [Express](https://expressjs.com/)
- [Prisma Client](https://www.prisma.io/docs)

## Contributing

### Download and install

#### For the API:

```
git clone <repository>
cd blackbird
docker-compose up
```

Go to `localhost:3000/docs` and see the Swagger API docs.

#### For the client:

```
cd client
yarn
yarn start
```

## Background Jobs

### Making changes to background jobs.

Changes in background jobs aren't detected. You'll need to restart the docker container for them:

```
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

To make changes to the database, change the schema.prisma file and then run:

```
docker exec -it blackbird-api npx prisma migrate dev
```

## Stripe

By default blackbird uses Stripe as its payment processor.

To test webhooks, you'll have to run this:

```
stripe listen --forward-to localhost:3000/v1/checkout/webhook
```

This will forward all stripe webhooks to your localhost:3000, and send them to the checkout/webhook URL. It'll also spit out a `STRIPE_WEBHOOK_SIGNING_SECRET`. You'll need to set that in the .env file.

Then to trigger a specific workflow:

```
# this is what's needed to store a subscription
stripe trigger checkout.session.completed --add checkout_session:metadata.userId=3 --add checkout_session:metadata.tierId=2
```

## CRON Jobs

Some cron jobs exist:

```
docker exec -it blackbird-api yarn ts-node src/jobs/announce-post-published.ts
```
