FROM ghcr.io/umami-software/umami:postgresql-latest

COPY umami/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
