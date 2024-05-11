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
