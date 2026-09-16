#!/bin/sh
# Provision the development / CI Garage node.
#
# Unlike MinIO, Garage serves nothing until a cluster layout has been assigned
# and applied, and it has no root-credentials-from-env concept — S3 keys are
# created through its admin API. The Garage image is distroless (no shell), so
# this runs in a small curl sidecar against the admin API instead of inside
# the Garage container.
#
# Every step is idempotent: this re-runs on every `docker compose up` and is a
# no-op once the volume is provisioned.

set -eu

ADMIN="http://${GARAGE_HOST:-garage}:3903/v2"
AUTH="Authorization: Bearer ${GARAGE_ADMIN_TOKEN}"
KEY_ID="${LOCAL_S3_USER}"
KEY_SECRET="${LOCAL_S3_PASSWORD}"
# Every bucket the app can address, so a browser's CORS preflight always lands
# on a bucket that already exists with CORS on it. The first three are the
# consolidated layout; the rest are the legacy per-media-type buckets still
# used by installs whose Settings.bucketNames is null. These mirror the
# constants at the top of src/utils/minio.ts — keep them in sync.
DEFAULT_BUCKETS="mirlo-audio mirlo-images mirlo-downloads
artist-avatars artist-banners incoming-artist-avatars incoming-artist-banners
incoming-covers incoming-merch-images incoming-mirlo-images incoming-track-audio
incoming-user-avatars incoming-user-banners merch-images mirlo-downloadable-content
mirlo-user-avatars mirlo-user-banners post-images track-audio track-format
trackgroup-covers trackgroup-format"
BUCKETS="${GARAGE_BUCKETS:-$DEFAULT_BUCKETS}"

api() { # method path [body]
  if [ $# -ge 3 ]; then
    curl -sS -X "$1" -H "$AUTH" -H 'Content-Type: application/json' -d "$3" "$ADMIN/$2"
  else
    curl -sS -X "$1" -H "$AUTH" "$ADMIN/$2"
  fi
}
# First "id"-like field of a JSON blob; enough for the two shapes we read.
first_id() { grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4; }

echo "garage-init: waiting for the admin API..."
i=0
until api GET GetClusterStatus >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 60 ] && { echo "garage-init: admin API never came up"; exit 1; }
  sleep 1
done

STATUS=$(api GET GetClusterStatus)
LAYOUT_VERSION=$(echo "$STATUS" | grep -o '"layoutVersion"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$')

if [ "${LAYOUT_VERSION:-0}" -eq 0 ]; then
  NODE=$(echo "$STATUS" | first_id)
  echo "garage-init: assigning cluster layout to node ${NODE}"
  api POST UpdateClusterLayout \
    "{\"roles\":[{\"id\":\"$NODE\",\"zone\":\"dc1\",\"capacity\":${GARAGE_CAPACITY:-10000000000},\"tags\":[]}]}" >/dev/null
  api POST ApplyClusterLayout '{"version":1}' >/dev/null
  echo "garage-init: layout applied"
else
  echo "garage-init: layout already applied (version ${LAYOUT_VERSION})"
fi

if [ "$(curl -sS -o /dev/null -w '%{http_code}' -H "$AUTH" "$ADMIN/GetKeyInfo?id=$KEY_ID")" = "200" ]; then
  echo "garage-init: key $KEY_ID already imported"
else
  echo "garage-init: importing key $KEY_ID"
  api POST ImportKey \
    "{\"accessKeyId\":\"$KEY_ID\",\"secretAccessKey\":\"$KEY_SECRET\",\"name\":\"mirlo\"}" >/dev/null
fi
# Mirlo creates buckets it doesn't find (legacy layout, or a prefixed one).
api POST "UpdateKey?id=$KEY_ID" '{"allow":{"createBucket":true}}' >/dev/null

# Pre-create the standard buckets with *global* aliases. Buckets that Mirlo
# creates itself over S3 only get an alias local to this key, which is enough
# for the app but leaves them invisible to `garage bucket info <name>` and to
# S3 browser UIs. Creating them here keeps those tools usable.
for b in $BUCKETS; do
  INFO=$(curl -sS -H "$AUTH" "$ADMIN/GetBucketInfo?globalAlias=$b" 2>/dev/null || true)
  BUCKET_ID=$(echo "$INFO" | first_id)
  if [ -z "$BUCKET_ID" ]; then
    BUCKET_ID=$(api POST CreateBucket "{\"globalAlias\":\"$b\"}" | first_id)
    echo "garage-init: created bucket $b"
  fi
  if [ -n "$BUCKET_ID" ]; then
    api POST AllowBucketKey \
      "{\"bucketId\":\"$BUCKET_ID\",\"accessKeyId\":\"$KEY_ID\",\"permissions\":{\"read\":true,\"write\":true,\"owner\":true}}" >/dev/null
  else
    echo "garage-init: WARNING could not resolve bucket $b"
  fi
done

echo "garage-init: ready"
