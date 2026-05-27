# Developers: Using the API

Mirlo offers two integration paths depending on what you want to build:

| Goal                                                                 | Use                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Build a music player that discovers and plays Mirlo content          | [Fairplayer / Canimus federation](#fairplayer-canimus-federation) |
| Build a deeper integration (purchases, user accounts, uploads, etc.) | [REST API](#rest-api)                                             |

---

> Note: this is under active development. We'll try to keep these docs up to date but feel free to ask in [our discord](https://discord.gg/VjKq26raKX) or on [our GitHub](https://github.com/funmusicplace/mirlo/issues) or or [Fairplayer's repo](https://codeberg.org/fairplayer/interop).

## Fairplayer / Canimus Federation

The [Fairplayer interop project](https://codeberg.org/fairplayer/interop) defines a set of lightweight protocols for interoperability across independent music platforms. Mirlo implements two of them: **catalog syndication** and **authorized streaming**.

This is the preferred approach if you're building a music player or aggregator and want to respect the "you host, we all syndicate" ethos — artists remain on Mirlo (or their own server), and your app discovers and plays their music without requiring a deep API integration.

Artists on Mirlo can individually opt in to social streaming from their settings, setting limits on play counts, etc.

### Catalog endpoint

```
GET {host}/v1/sm/canimus.json
```

Returns a catalog of all artists who have opted in to federated streaming, along with their releases and tracks.

**Query parameters**

| Parameter  | Type            | Description                                                                                                                                              |
| ---------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fromDate` | ISO 8601 string | Only return entities created or updated since this date. Also includes any artists whose opt-in date falls after this date. Useful for incremental sync. |
| `skip`     | integer         | Offset for pagination                                                                                                                                    |
| `take`     | integer         | Limit for pagination                                                                                                                                     |

**Response shape**

```json
{
  "type": "root",
  "url": "https://mirlo.space",
  "children": [
    {
      "type": "artist",
      "name": "Artist Name",
      "url": "https://mirlo.space/artist-slug",
      "images": {
        "cover": { "src": "...", "alt": null, "width": 600, "height": 600 }
      },
      "summary": "Short description",
      "description": "Full bio",
      "links": [
        { "name": "Bandcamp", "href": "https://...", "type": "bandcamp" }
      ],
      "children": [
        {
          "type": "album",
          "name": "Album Title",
          "url": "https://mirlo.space/artist-slug/release/album-slug",
          "release_date": "2024-01-15T00:00:00.000Z",
          "license": "CC BY-SA 4.0",
          "artist": "Artist Name",
          "images": {
            "cover": { "src": "..." }
          },
          "description": "About this album",
          "children": [
            {
              "type": "track",
              "name": "Track Title",
              "url": "https://mirlo.space/artist-slug/release/album-slug/tracks/42",
              "duration": 213.4,
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
  "deleted": [{ "type": "artist", "name": "Gone Artist", "url": "..." }]
}
```

The `deleted` array contains artists (and their releases/tracks) that have since opted out or been removed from Mirlo. Clients doing incremental sync should remove these from their local state.

### Authorized streaming

Tracks are streamed over HLS. Because access may be gated (e.g. paid releases with free preview limits), Mirlo uses a two-step token flow defined in the [Fairplayer streaming spec](https://codeberg.org/fairplayer/interop/src/branch/main/streaming/index.md).

**Step 1 — Request the manifest**

```
GET /v1/tracks/{id}/stream/external/playlist.m3u8
```

Required headers:

| Header                | Description                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `mirlo-api-key`       | Your API key (see [Getting an API key](#getting-an-api-key) below)                                                                       |
| `social-music-userid` | A stable identifier for the listener in your app (e.g. a hashed user ID). This is used to tie the play token to a specific user session. |

On success, the response includes:

| Header                   | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `social-music-playtoken` | A short-lived JWT (4 hours) scoped to this track and user |

The response body is the HLS manifest (`.m3u8`).

**Step 2 — Request segments**

Append the play token and user ID as query parameters to every segment URL:

```
GET /v1/tracks/{id}/stream/external/{segment}.ts?playtoken={token}&userid={userid}
```

> **Why query params?** The spec uses query parameters rather than headers so that audio requests are treated as [CORS simple requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#simple_requests), avoiding preflight round-trips.

**Error codes**

| Code  | Meaning                                                              |
| ----- | -------------------------------------------------------------------- |
| `401` | Missing or invalid API key, or missing play token on segment request |
| `402` | Track play limit exceeded (user has hit their free preview count)    |
| `403` | Play token doesn't match the requested track/user                    |
| `404` | Track not found, or user is not allowed to access it                 |

---

## REST API

For deeper integrations — managing artist profiles, handling purchases, accessing user data — Mirlo exposes a full REST API.

Interactive API documentation is available at **[mirlo.space/docs](https://mirlo.space/docs)** (Swagger/OpenAPI).

### Getting an API key

API keys are scoped to a registered client application.

- **On mirlo.space:** Email [hi@mirlo.space](mailto:hi@mirlo.space) to request a key. Include a brief description of what you're building.
- **Self-hosted instances:** You can issue a key directly by editing the `client` table in the database.

::: info Self-service API keys
We're working on a way for developers to generate and manage API keys from within Mirlo itself, without needing to contact us. If you're interested in this or have thoughts on how it should work, [open an issue on GitHub](https://github.com/funmusicplace/mirlo/issues).
:::

---

## Which approach should I use?

**Use Canimus/Fairplayer federation if:**

- You're building a music player, aggregator, or discovery app
- You want to support multiple platforms beyond Mirlo (Faircamp, etc.)
- You want to stay close to the "decentralised, artist-owned" ethos

**Use the REST API if:**

- You need to create or manage content (uploads, artist profiles, posts)
- You're building payment or purchase flows
- You need access to non-public data (subscriber lists, analytics)
- You're integrating Mirlo as a backend for your own platform

The two approaches can also be combined: use the catalog endpoint to discover content, and the REST API for everything that requires a user account.
