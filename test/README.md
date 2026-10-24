# Tests

To run these tests in docker compose:

```
docker compose run test
```

> Note: you'll need to recreate the container between each run if you're making changes. You can do so with `docker compose --profile=test run --build test`
>
> You can also use `docker compose --profile=test watch` to rerun tests on changes - but you'll need to run `docker compose --profile=test logs -f` separately in order to see the log output.

To clean up these containers afterwards, the `--profile=test` argument needs to be passed to docker:

```
docker compose --profile=test down
```

Specific tests can be run filtering by title with the grep argument:

```
docker compose --profile=test run --build test yarn api:test --grep "federated"
```

## ffmpeg integration tests

Some tests (for example [test/utils/tracks.integration.spec.ts](test/utils/tracks.integration.spec.ts)) run real audio conversion and run by default.

If you need to skip them temporarily:

```bash
SKIP_FFMPEG_INTEGRATION_TESTS=1 yarn api:test
```

## Mobile endpoint guard

[test/contracts/mirloMobile.spec.ts](contracts/mirloMobile.spec.ts) fails when the API stops serving a route that the [Mirlo mobile app](https://github.com/funmusicplace/mirlo-mobile) calls. It downloads the app's route list (`api-endpoints.json` on its `main` branch) from raw.githubusercontent.com and checks each `/v1` route against `/v1/api-docs`. It probes the other routes directly.

To check a different copy of the list, such as the one on an app pull request, set `MIRLO_MOBILE_ENDPOINTS` to an http(s) URL or to a file path inside the test container:

```bash
docker compose --profile=test run -e MIRLO_MOBILE_ENDPOINTS=https://raw.githubusercontent.com/funmusicplace/mirlo-mobile/BRANCH/api-endpoints.json test yarn api:test --grep "mirlo-mobile"
```

## Cypress tests

See the `client/cypress` folder.
