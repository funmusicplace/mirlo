#!/bin/bash
NAMESPACE=${1:-mirlo}
source ./.secrets

generate_key() {
  openssl rand -hex 24
}

create_secret() {
    name=$1
    shift
    kubectl -n $NAMESPACE delete secret $name || echo "...secret ${name} didn't exist."
    kubectl -n $NAMESPACE create secret generic $name $@
}

# these can be created randomly:
JWT_SECRET=$(generate_key)
REFRESH_TOKEN_SECRET=$(generate_key)
REDIS_PASSWORD=$(generate_key)

create_secret redis \
  --from-literal=password=${REDIS_PASSWORD}

create_secret mirlo-db \
  --from-literal=url=${DATABASE_URL}

create_secret mirlo-tokens \
  --from-literal=jwt_secret=${JWT_SECRET} \
  --from-literal=refresh_secret=${REFRESH_TOKEN_SECRET}

create_secret mirlo-s3-keys \
  --from-literal=access_key=${S3_ACCESS_KEY_ID} \
  --from-literal=secret_key=${S3_SECRET_ACCESS_KEY}

create_secret turnstile \
  --from-literal=secret=${CLOUDFLARE_TURNSTILE_API_SECRET}
