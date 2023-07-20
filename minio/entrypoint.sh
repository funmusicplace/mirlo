#!/usr/bin/env sh
# wrapper for docker entrypoint that takes into account the PORT env var

exec docker-entrypoint.sh server --console-address ":$CONSOLE_PORT" --address ":9000" /data