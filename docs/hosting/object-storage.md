# Object storage & bucket structure

Mirlo stores all media (audio, images, downloadable files) in S3-compatible
object storage: [Garage](https://garagehq.deuxfleurs.fr/) in local development
and CI, Backblaze B2 (or any S3-compatible provider) in production.

All storage access goes through [`src/utils/minio.ts`](https://github.com/funmusicplace/mirlo/blob/main/src/utils/minio.ts),
which is a backend-agnostic abstraction over both the MinIO SDK (used to talk
to Garage) and the AWS S3 client (the filename is historical). Call sites express intent (`uploadIncomingAudio`,
`getCoverBuffer`, `uploadZip`, …) and that module decides which bucket and
object key to use.

## Buckets

Mirlo uses three buckets: `mirlo-audio`, `mirlo-images` and
`mirlo-downloads`. An optional prefix, set in the admin settings UI (the
`bucketNames` value in the `Settings` table), is prepended to each name, so an
instance configured with `{ "prefix": "myinstance-" }` uses the buckets
`myinstance-mirlo-audio`, `myinstance-mirlo-images` and
`myinstance-mirlo-downloads`. This matters for providers like Backblaze where
bucket names are globally unique.

### `mirlo-audio`

| Key                                                 | Contents                                     |
| --------------------------------------------------- | -------------------------------------------- |
| `incoming/<audioId>`                                | Raw uploaded audio, before FFmpeg processing |
| `<audioId>/original.<ext>`                          | The original file, kept after processing     |
| `<audioId>/playlist.m3u8`, `<audioId>/segment-*.ts` | HLS stream segments                          |

### `mirlo-images`

Image keys are prefixed with the media type they belong to:

| Key prefix                           | Contents                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `incoming/<type>/<imageId>`          | Uploaded images awaiting optimization                                     |
| `trackgroup-covers/`                 | Album/release covers                                                      |
| `artist-avatars/`, `artist-banners/` | Artist profile images                                                     |
| `merch-images/`                      | Merch photos uploaded before they moved to the bucket root                |
| `post-images/`                       | Images embedded in posts                                                  |
| `instance-logos/`                    | Header logos uploaded by the instance admins                              |
| _(bucket root)_                      | Generic images (the `image` type): subscription tier images, merch photos |

Optimized images are stored in multiple sizes as `<imageId>-x<width>.webp`
(plus `.jpg` for covers).

The full routing table (path prefix, and whether the type goes through the
optimize-image queue) is `imageTypeBuckets`
in `src/utils/minio.ts` — that is the single source of truth if this document
drifts.

### `mirlo-downloads`

| Key                            | Contents                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| `content/<id>`                 | Downloadable content attached to releases/merch (PDFs, etc.) |
| `trackgroup/<id>/<format>.zip` | Cached album download zips, per audio format                 |
| `track/<id>/<format>.zip`      | Cached single-track download zips                            |

## How images are served

In development (Garage), the API proxies images at
`/images/<bucket>/<key>` — note that the key can contain slashes (e.g.
`/images/mirlo-images/trackgroup-covers/<id>-x600.webp`).

In production (S3/Backblaze), URLs point either at a CDN (`cdnUrl` in site
settings) or directly at the provider's public bucket URL. URL construction
lives in `generateFullStaticImageUrl` in `src/utils/images.ts`, which derives
the bucket and key prefix from the same routing table used for uploads.

Buckets are created automatically on first use. Garage additionally
pre-creates `mirlo-audio`, `mirlo-images` and `mirlo-downloads` in
`scripts/garage/init.sh` so they carry _global_ aliases — buckets created over
the S3 API are only aliased locally to the key that made them, which works
fine for the app but hides them from `garage bucket info <name>` and from S3
browser UIs.

## Inspecting storage in development

Garage has no web console. The `garage` binary is the entrypoint of a
distroless image, so run it with `docker exec` (there's no shell to `sh` into):

```bash
docker exec blackbird-garage /garage bucket list
docker exec blackbird-garage /garage bucket info mirlo-images       # size, object count
docker exec blackbird-garage /garage bucket inspect-object mirlo-images <key>
docker exec blackbird-garage /garage status
```

That covers cluster and bucket state but cannot list objects — Garage's CLI is
cluster administration, not an object browser. For browsing objects, point any
S3 client at `localhost:9000` with the `LOCAL_S3_USER` / `LOCAL_S3_PASSWORD`
from your `.env`:

```bash
export MC_HOST_dev="http://$LOCAL_S3_USER:$LOCAL_S3_PASSWORD@localhost:9000"
mc ls --recursive dev/mirlo-images
mc du dev/mirlo-audio
mc stat dev/mirlo-images/trackgroup-covers/<id>-x600.webp
```

`rclone`, `aws s3` and `s5cmd` work the same way. If you want a visual
browser, [garage-webui](https://github.com/khairul169/garage-webui) runs
against the admin API on port 3903 and lists buckets and objects; it resolves
buckets by global alias, which is why `init.sh` pre-creates them.

## Provisioning (development / CI only)

Garage serves nothing until a cluster layout is assigned, and its S3 keys are
created through the admin API rather than read from environment variables. The
`garage-init` compose service ([`scripts/garage/init.sh`](https://github.com/funmusicplace/mirlo/blob/main/scripts/garage/init.sh))
does that on every `docker compose up` and is a no-op once provisioned: it
assigns the layout, imports the key from `LOCAL_S3_USER` /
`LOCAL_S3_PASSWORD`, and pre-creates the standard buckets. `api` and
`background` wait on it via `service_completed_successfully`.

Both services sit behind the `garage` compose profile, enabled by
`COMPOSE_PROFILES=garage` in `.env` (the default in `.env.example`). Installs
on an external S3 service leave it unset, so the containers never start; the
dependency is `required: false`, so `api` and `background` start without them.

Garage validates key shape: the access key must be `GK` followed by 24 hex
characters and the secret exactly 64 hex characters. A malformed key fails at
import with `Invalid key format`; a mismatched pair fails _every_ S3 request
with `AuthorizationHeaderMalformed`.
