# Nomads

A RESTful API and client.

Main libraries:

- [Express](https://expressjs.com/)
- [Prisma Client](https://www.prisma.io/docs)

## Contributing

### Download and install

```
git clone <repository>
cd nomads
yarn install
# Seed the DB
npx prisma migrate dev
# Install the client
cd client && yarn install
# Go back to root
cd ../
# run both the client and the back-end
yarn dev
```
