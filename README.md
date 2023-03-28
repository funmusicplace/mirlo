# Nomads

A RESTful API and client.

Main libraries:

- [Express](https://expressjs.com/)
- [Prisma Client](https://www.prisma.io/docs)

## Contributing

### Download and install

#### For the API:

```
git clone <repository>
cd nomads
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
docker-compose up --no-deps background
```

## Workers (Uploading Music, Images, Etc)

If you want to upload music or upload images, you'll need a worker running.

```sh
docker exec -it nomads-api node src/jobs/queue-worker.js run
```

> NOTE: this is done automatically by the `nomads-background` container in docker.

> NOTE: In local development you can see the worker queue at /admin/queues on the server

### Running migrations

To make changes to the database, change the schema.prisma file and then run:

```
docker exec -it nomads-api npx prisma migrate dev
```
