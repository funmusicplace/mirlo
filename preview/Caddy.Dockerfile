# Caddy with the Cloudflare DNS module, for DNS-01 wildcard certificates on
# *.preview.mirlo.space.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
