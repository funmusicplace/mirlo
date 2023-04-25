FROM jrottenberg/ffmpeg:5.0-alpine as ffmpeg

FROM node:lts-alpine3.16
# Create app directory
ENV NODE_APP_DIR=/var/www/api/src
WORKDIR /var/www/api

COPY . . 
RUN yarn install --force

# # copy ffmpeg bins
COPY --from=ffmpeg / /

EXPOSE 3000

CMD ["yarn", "ts-node", "src/jobs/queue-worker.ts", "run"]
