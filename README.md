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

### Making changes to background jobs.

Changes in background jobs aren't detected. You'll need to restart the docker container for them:

```
docker-compose up --no-deps background
```

### Running migrations
