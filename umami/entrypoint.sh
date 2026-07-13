#!/bin/sh
# Render only lets us provision the `blackbrd` database via the blueprint,
# and blueprints don't support string interpolation in env var values
# (see render.yaml), so the /umami database swap happens here instead.
set -eu

export DATABASE_URL="${BASE_DATABASE_URL%/*}/umami"

exec npm run start-docker
