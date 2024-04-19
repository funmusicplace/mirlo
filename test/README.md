# Tests

To run these tests in docker compose:

```
docker compose run test
```

To clean up these containers afterwards, the `--profile=test` argument needs to be passed to docker:

```
docker compose --profile=test down
```
