# File storage

During development we use Minio to store our files. On production, mirlo.spaces uses backblaze. You could theoretically (if untested) use any S3 compatible client to do this.

You can access dev MinIO at localhost:9001 with the MINIO_ROOT_USER and MINIO_ROOT_PASSWORD you set in .env

See [the design decisions and thinking that went into this](../technical_designs/2024-12-scalable-audio-storage.md).

For bandwidth reasons, we get a pre-signed upload URL when uploading a track, that uploads directly to the relevant Backblaze bucket (incoming track audio for now).

## Updating CORS on backblaze

Using the backblaze command line tool, after authenticating (`b2 authorize`).

```
b2 bucket update --cors-rules "$(<./b2-cors-rules.json)" incoming-track-audio
```

You'll need to wait a minute for this to take effect.

## CORS and MiniO.

However, this doesn't work for MinIO. You [need the paid version of MinIO](https://github.com/minio/minio/discussions/20841) to set CORS on a per-bucket basis.

It looks like it should be possible to set CORS for MinIO as a whole, but there might be some issues with actually making it catch. In the mean time MinIO uploads don't do direct uploads with signed urls.
