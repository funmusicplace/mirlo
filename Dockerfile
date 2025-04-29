FROM node:18-bookworm-slim AS base

# Install ffmpeg
RUN apt-get update -qq
RUN apt-get install -qq --no-install-recommends ffmpeg >/dev/null

# Create app directory
ENV NODE_APP_DIR=/var/www/api/src \
	NODE_ENV=production
WORKDIR /var/www/api

# Prepare yarn@4.1.1 (this should match the version in package.json)
RUN corepack enable
RUN corepack prepare yarn@4.1.1 --activate

COPY package.json yarn.lock .yarnrc.yml .
COPY prisma/package.json ./prisma/package.json
COPY client/package.json ./client/package.json
RUN --mount=type=cache,target=/root/.yarn,sharing=locked YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable

COPY prisma ./prisma
RUN yarn prisma:build

COPY . .

EXPOSE 3000

FROM base AS api
CMD [ "/bin/sh", "-c", "yarn prisma:migrate:deploy && yarn ts-node src/index.ts" ]
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD ["yarn", "ts-node", "src/healthcheck.ts"]

FROM base AS background
CMD [ "yarn", "ts-node", "src/jobs/queue-worker.ts", "run"]
HEALTHCHECK --interval=10s CMD ["true"]
