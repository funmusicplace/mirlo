# Catalog feeds and streaming (Canimus)

The [Fairplayer interop project](https://codeberg.org/fairplayer/interop) defines a set of lightweight protocols for interoperability across independent music platforms. Mirlo implements two of them: **catalog syndication**, using the [Canimus format](https://github.com/PlaidWeb/Chorus/blob/6ce0b6d887f7c6e101257a9982f3e7e7bae91dd0/format.md), and **authorized streaming**.

This is the preferred approach if you're building a music player or aggregator and want to respect the "you host, we all syndicate" ethos: artists remain on Mirlo (or their own server), and your app discovers and plays their music without needing a deeper API integration.

Artists choose whether their music appears in these feeds by turning on [Discovery](../how-tos/social-web-and-discovery.md#discovery) in their profile settings.

::: info Canimus and Chorus
Canimus has since been revised and renamed [Chorus](https://github.com/PlaidWeb/Chorus). Mirlo's feeds still use Canimus.
:::

## Which artists are included

The feeds include artists who have turned on Discovery and whose profiles are enabled. For each artist, they include published releases with at least one finished track.

Mirlo's own apps, and apps an instance's admins trust in the same way, can be given a **full catalogue** key. Requests made with that key include every enabled artist, whether or not they turned on Discovery. Admins turn this on per client from the admin clients page.

## Catalog endpoint

```
GET {host}/v1/sm/canimus.json
```

Returns every included artist, with their releases and tracks.

Instances advertise this feed on their web pages with `<link rel="alternate" type="application/canimus+json">`, so you can find it from any page on the instance.

### Query parameters

| Parameter  | Type            | Description                                                                                                                                                             |
| ---------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fromDate` | ISO 8601 string | Only return entities created or updated since this date, plus artists who turned on Discovery since then, and anything removed since then. Useful for incremental sync. |
| `skip`     | integer         | Offset for pagination                                                                                                                                                   |
| `take`     | integer         | Page size. Required with a full catalogue key, at most 100.                                                                                                             |

### Pagination

Without `take`, the response is the whole catalog. With `take`, each kind of entry is paged separately: a page has up to `take` artists in `children`, and up to `take` each of removed artists, releases and tracks in `deleted`. When there may be more to fetch, the root has a `links` entry with `"rel": "next"` whose `href` is the next page, with your other query parameters kept. Keep following it until a response has no `next` link. The last page may be empty.

```json
{
  "type": "root",
  "links": [
    {
      "name": "Next page",
      "href": "https://mirlo.space/v1/sm/canimus.json?take=50&skip=50",
      "type": "application/canimus+json",
      "rel": "next"
    }
  ],
  "children": [],
  "deleted": []
}
```

### Response shape

```json
{
  "type": "root",
  "url": "https://mirlo.space",
  "children": [
    {
      "type": "artist",
      "name": "Artist Name",
      "url": "https://mirlo.space/artist-slug",
      "uid": "12",
      "images": {
        "cover": { "src": "...", "alt": null, "width": 600, "height": 600 }
      },
      "summary": "Short description",
      "description": "Full bio",
      "links": [
        {
          "name": "Bandcamp",
          "href": "https://...",
          "type": "bandcamp",
          "rel": "me"
        },
        {
          "name": "Canimus feed",
          "href": "https://mirlo.space/v1/artists/12/canimus.json",
          "type": "application/canimus+json",
          "rel": "alternate"
        }
      ],
      "updated_date": "2026-10-01",
      "children": [
        {
          "type": "album",
          "name": "Album Title",
          "url": "https://mirlo.space/artist-slug/release/album-slug",
          "uid": "34",
          "release_date": "2024-01-15",
          "updated_date": "2026-09-30",
          "license": "CC BY-SA 4.0",
          "artist": "Artist Name",
          "images": {
            "cover": { "src": "...", "alt": "...", "width": 600, "height": 600 }
          },
          "links": [
            {
              "name": "Canimus feed",
              "href": "https://mirlo.space/v1/trackGroups/34/canimus.json",
              "type": "application/canimus+json",
              "rel": "alternate"
            },
            {
              "name": "Buy Album Title on Mirlo",
              "href": "https://mirlo.space/artist-slug/release/album-slug?buy=true",
              "type": "Purchase",
              "rel": "purchase"
            }
          ],
          "description": "About this album",
          "children": [
            {
              "type": "track",
              "name": "Track Title",
              "url": "https://mirlo.space/artist-slug/release/album-slug/tracks/42",
              "id": "42",
              "duration": 213.4,
              "track": 1,
              "media": [
                {
                  "src": "https://mirlo.space/v1/tracks/42/stream/external/playlist.m3u8",
                  "type": "audio/x-mpegurl"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "deleted": [
    { "type": "artist", "name": "Gone Artist", "url": "...", "uid": "56" }
  ]
}
```

A track's `media` is `null` when the track can only be heard after buying it.

### Deletions

The `deleted` array lists what you should remove from your copy:

- artists who turned off Discovery, were disabled, or were deleted
- releases and tracks that were deleted

Artists and releases in `deleted` have the same `url` and `uid` they had in `children`, and tracks have the same `url` and `id`. With a full catalogue key, turning off Discovery doesn't count as a deletion.

## Feeds for one artist or release

```
GET {host}/v1/artists/{id}/canimus.json
GET {host}/v1/trackGroups/{id}/canimus.json
```

These return a single artist (with their releases and tracks) or a single release (with its tracks), in the same format as the nodes in the catalog. They follow the same rules about which artists are included, and return `404` for anything the catalog wouldn't list.

- `{id}` for an artist can be its numeric ID or its URL slug.
- `{id}` for a release can be its numeric ID, or its URL slug together with `?artistId={artist id or slug}`.

You don't need to build these URLs yourself: every artist and release in the catalog links to its own feed with `"rel": "alternate"` and `"type": "application/canimus+json"`.

## Authorized streaming

Tracks are streamed over HLS. Because access may be gated (e.g. paid releases with free preview limits), Mirlo uses a two-step token flow defined in the [Fairplayer streaming spec](https://codeberg.org/fairplayer/interop/src/branch/main/streaming/index.md).

**Step 1: request the manifest**

```
GET /v1/tracks/{id}/stream/external/playlist.m3u8
```

Required headers:

| Header                | Description                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `mirlo-api-key`       | Your API key (see [Getting an API key](./index.md#getting-an-api-key))                                                                   |
| `social-music-userid` | A stable identifier for the listener in your app (e.g. a hashed user ID). This is used to tie the play token to a specific user session. |

On success, the response includes:

| Header                   | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `social-music-playtoken` | A JWT, valid for 2 days, scoped to this track and listener |

The response body is the HLS manifest (`.m3u8`).

**Step 2: request segments**

Append the play token and user ID as query parameters to every segment URL:

```
GET /v1/tracks/{id}/stream/external/{segment}.ts?playtoken={token}&userid={userid}
```

> **Why query params?** The spec uses query parameters rather than headers so that audio requests are treated as [CORS simple requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#simple_requests), avoiding preflight round-trips.

**Error codes**

| Code  | Meaning                                                                                |
| ----- | -------------------------------------------------------------------------------------- |
| `400` | Missing `social-music-userid` header on the manifest request, or an invalid play token |
| `401` | Missing or invalid API key, or missing play token on a segment request                 |
| `402` | Track play limit exceeded (the listener has used up their free plays)                  |
| `403` | Play token doesn't match the requested track or listener                               |
| `404` | Track not found, or the listener isn't allowed to hear it                              |
