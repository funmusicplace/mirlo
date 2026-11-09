list:
    just --list

infra:
    docker compose up -d garage redis pgsql background

setup:
    yarn install
    yarn prisma:build
    yarn prisma:migrate
    yarn prisma:seed

local:
    #!/bin/bash
    set -a
    source ./.env.local
    yarn api:watch

client:
    #!/bin/bash
    set -a
    source ./.env.local
    cd client
    yarn client:start

client-prod-build:
    #!/bin/bash
    set -a
    source ./.env
    cd client
    yarn install
    yarn client:build

test filter:
    #!/bin/bash
    set -a
    source ./.env.local
    npx mocha -f {{filter}} --exit

debug:
    #!/bin/bash
    set -a
    source ./.env.local
    node --inspect-brk -r ts-node/register src/index.ts

psql:
    docker compose exec -ti pgsql psql -U nomads

pgdump:
    #!/bin/bash
    file="mirlo-backup-`date +%Y%m%d-%H%M`.sql"
    docker compose exec -ti pgsql pg_dump --clean -U nomads > ${file}
    echo "Backup created as ${file}"

pgrestore file:
    #!/bin/bash
    docker compose cp {{file}} pgsql:/tmp/backup.sql
    docker compose exec -ti pgsql psql -U nomads -f /tmp/backup.sql

worker:
    #!/bin/bash
    set -a
    source ./.env.local
    yarn ts-node src/jobs/queue-worker.ts run

migrate:
    #!/bin/bash
    set -a
    source ./.env.local
    cd prisma
    yarn prisma:migrate

TAG := `date -u +%Y%m%d-%H%M`

package tag=TAG:
    docker build . -t txels/mirlo:latest -t txels/mirlo:{{tag}} -m 8g --memory-swap 8g --target prod

publish tag=TAG:
    docker push txels/mirlo:{{tag}}
    docker push txels/mirlo:latest

[group('ops')]
pod:
  @kubectl -n mirlo get pod --field-selector status.phase=Running -l service=mirlo-api -o name | head -n 1 | tr -d '[:space:]' | cut -f2 -d/

[group('ops')]
pod-bg:
  @kubectl -n mirlo get pod --field-selector status.phase=Running -l service=mirlo-background -o name | head -n 1 | tr -d '[:space:]' | cut -f2 -d/

[group('ops')]
podlog *args:
  @kubectl -n mirlo logs -f $(just pod) -- {{args}}

[group('ops')]
podlog-bg *args:
  @kubectl -n mirlo logs -f $(just pod-bg) -- {{args}}


[group('ops')]
podrun *args:
   @kubectl -n mirlo exec -ti $(just pod) -- {{args}}

admin-user email pass name:
   @just podrun "sh -c 'ADMIN_EMAIL={{email}} ADMIN_PASSWORD={{pass}} ADMIN_NAME={{name}} yarn setup:admin'"

register-client:
    just podrun yarn setup:client
