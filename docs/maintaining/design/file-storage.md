# File storage

During development we use [Garage](https://garagehq.deuxfleurs.fr/) to store our files. On production, mirlo.spaces uses backblaze. You could theoretically (if untested) use any S3 compatible client to do this.

Garage has no web console. Point an S3 client (`mc`, `rclone`, `aws s3`) at localhost:9000 with the LOCAL_S3_USER and LOCAL_S3_PASSWORD you set in .env, or use `docker exec blackbird-garage /garage bucket list`. See [object-storage.md](../../hosting/object-storage.md#inspecting-storage-in-development).

See [the design decisions and thinking that went into this](../../technical_designs/2024-12-scalable-audio-storage.md).

For bandwidth reasons, we get a pre-signed upload URL when uploading a track, that uploads directly to the relevant Backblaze bucket (incoming track audio for now).

## Updating CORS on backblaze

Using the backblaze command line tool, after authenticating (`b2 authorize`).

```
b2 bucket update --cors-rules "$(<./b2-cors-rules.json)" incoming-track-audio
```

You'll need to wait a minute for this to take effect.

## CORS in development

This used to be impossible locally: setting CORS per bucket [needed the paid version of MinIO](https://github.com/minio/minio/discussions/20841), so dev uploads never used direct signed-URL uploads the way production does.

Garage implements `PutBucketCors`, so that restriction is gone — a dev bucket can carry the same CORS rules as a Backblaze one. Nothing applies them yet: `applyCorsPolicyS3` in `src/utils/minio.ts` still runs only on the Backblaze path. Wiring it up for Garage would let dev exercise the same direct-upload flow as production.
