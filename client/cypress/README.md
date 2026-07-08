# E2E Tests

There are a couple different ways to run these tests, depending your goal. Note that if you encounter failures running tests locally, but not in CI, you might have found a flaky test. Contributions welcome!

## Run against development client

You can quickly check new tests against your changes if you don't want to worry about building the client yet.

1. `docker compose up -d`
2. `yarn client:start`. Depending on your system, you may need to add `--host 127.0.0.1` to make sure Cypress can find localhost over IPv4 (which it appears to require).
3. `yarn client:cy:run --spec cypress/e2e/<new-test-file>.cy.ts`. You may need to add `DATABASE_URL="postgresql://nomads:nomads@localhost:5434/nomads?schema=public"` before the command so that Cypress can access the database.

You can also run all the tests this way by omitting the `--spec` option.

## Run against production client

When you're ready to push your changes to CI, you might want to try running tests locally more similar to how CI does it. Although not a perfect mirror (contributions welcome!), you will often get better results than with the development client.

1. `docker compose up -d`
2. `docker exec -it blackbird-api yarn client:build`. The client needs to be built inside the API container so that the production SSR server can find it.
3. `CI=1 yarn client:cy:run`. The CI flag needs to be enabled so that Cypress knows to check localhost:3000, which is where the API container serves the client.
