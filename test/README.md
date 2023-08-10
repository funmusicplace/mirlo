# Tests

Run the test docker compose:

```
docker-compose -f docker-compose.yml -f test.docker-compose.yml up
```

And then run the tests:

```
docker exec -it blackbird-api yarn test
```
