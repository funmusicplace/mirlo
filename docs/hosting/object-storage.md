# Object storage & bucket structure

Mirlo stores all media (audio, images, downloadable files) in S3-compatible
object storage: MinIO in local development, Backblaze B2 (or any S3-compatible
provider) in production.

All storage access goes through [`src/utils/minio.ts`](https://github.com/funmusicplace/mirlo/blob/main/src/utils/minio.ts),
which is a backend-agnostic abstraction over both MinIO and S3 clients (the
filename is historical). Call sites express intent (`uploadIncomingAudio`,
`getCoverBuffer`, `uploadZip`, …) and that module decides which bucket and
object key to use.

## Two bucket layouts

There are two supported bucket layouts, controlled by the `bucketNames` value
in the `Settings` table (editable in the admin settings UI):

| `bucketNames` value        | Mode                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `null`                     | **Legacy**: one bucket per media type (~14 buckets). Existing installs stay on this — nothing moves. |
| `{ "prefix": "<string>" }` | **Consolidated**: 3 buckets with path prefixes. New installs default to `{ "prefix": "" }`.          |

The `prefix` is prepended to the three consolidated bucket names, so an
instance configured with `{ "prefix": "myinstance-" }` uses the buckets
`myinstance-mirlo-audio`, `myinstance-mirlo-images` and
`myinstance-mirlo-downloads`. This matters for providers like Backblaze where
bucket names are globally unique.

## Consolidated layout

### `mirlo-audio`

| Key                                                 | Contents                                     |
| --------------------------------------------------- | -------------------------------------------- |
| `incoming/<audioId>`                                | Raw uploaded audio, before FFmpeg processing |
| `<audioId>/original.<ext>`                          | The original file, kept after processing     |
| `<audioId>/playlist.m3u8`, `<audioId>/segment-*.ts` | HLS stream segments                          |

### `mirlo-images`

Image keys are prefixed with the media type they belong to. The prefixes
deliberately reuse the **legacy final bucket names**, so migrating an existing
install is a straight copy of each legacy bucket into a same-named folder:

| Key prefix                                   | Contents                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `incoming/<type>/<imageId>`                  | Uploaded images awaiting optimization                            |
| `trackgroup-covers/`                         | Album/release covers                                             |
| `artist-avatars/`, `artist-banners/`         | Artist profile images                                            |
| `mirlo-user-avatars/`, `mirlo-user-banners/` | User profile images                                              |
| `merch-images/`                              | Merch photos                                                     |
| `post-images/`                               | Images embedded in posts                                         |
| _(bucket root)_                              | Generic images (the `image` type, e.g. subscription tier images) |

Optimized images are stored in multiple sizes as `<imageId>-x<width>.webp`
(plus `.jpg` for covers).

The full routing table (incoming bucket, final bucket, path prefix, and
whether the type goes through the optimize-image queue) is `imageTypeBuckets`
in `src/utils/minio.ts` — that is the single source of truth if this document
drifts.

### `mirlo-downloads`

| Key                            | Contents                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| `content/<id>`                 | Downloadable content attached to releases/merch (PDFs, etc.) |
| `trackgroup/<id>/<format>.zip` | Cached album download zips, per audio format                 |
| `track/<id>/<format>.zip`      | Cached single-track download zips                            |

## Legacy layout

One bucket per media type, with bare object keys. Most types have a separate
`incoming-*` bucket for uploads awaiting processing:

| Media                | Incoming bucket           | Final bucket                 |
| -------------------- | ------------------------- | ---------------------------- |
| Track audio          | `incoming-track-audio`    | `track-audio`                |
| Release covers       | `incoming-covers`         | `trackgroup-covers`          |
| Artist avatars       | `incoming-artist-avatars` | `artist-avatars`             |
| Artist banners       | `incoming-artist-banners` | `artist-banners`             |
| User avatars         | `incoming-artist-avatars` | `mirlo-user-avatars`         |
| User banners         | `incoming-user-banners`   | `mirlo-user-banners`         |
| Merch images         | `incoming-merch-images`   | `merch-images`               |
| Post images          | —                         | `post-images`                |
| Generic images       | `incoming-mirlo-images`   | `mirlo-images`               |
| Downloadable content | —                         | `mirlo-downloadable-content` |
| Album zips           | —                         | `trackgroup-format`          |
| Track zips           | —                         | `track-format`               |

## How images are served

In development (MinIO), the API proxies images at
`/images/<bucket>/<key>` — note that in consolidated mode the key contains
slashes (e.g. `/images/mirlo-images/trackgroup-covers/<id>-x600.webp`).

In production (S3/Backblaze), URLs point either at a CDN (`cdnUrl` in site
settings) or directly at the provider's public bucket URL. URL construction
lives in `generateFullStaticImageUrl` in `src/utils/images.ts`, which derives
the bucket and key prefix from the same routing table used for uploads.

Buckets are created automatically on first use; MinIO needs no manual setup.
