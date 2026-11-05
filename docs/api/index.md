# Developers: Using the API

Mirlo offers a few integration paths depending on what you want to build:

| Goal                                                                 | Use                                                      |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| Build a music player that discovers and plays Mirlo content          | [Fairplayer / Canimus federation](./canimus.md)          |
| Build a deeper integration (purchases, user accounts, uploads, etc.) | [REST API](#rest-api)                                    |
| Play a listener's purchases in a Subsonic app                        | [Subsonic API](../how-tos/listening-in-subsonic-apps.md) |

---

> Note: this is under active development. We'll try to keep these docs up to date but feel free to ask in [our discord](https://discord.gg/VjKq26raKX) or on [our GitHub](https://github.com/funmusicplace/mirlo/issues) or or [Fairplayer's repo](https://codeberg.org/fairplayer/interop).

## Fairplayer / Canimus federation

If you're building a music player, aggregator or discovery app, use the catalog feeds and authorized streaming described in [Catalog feeds and streaming (Canimus)](./canimus.md). Your app reads which artists, releases and tracks are available from a feed, and streams tracks with a play token, without needing a deeper API integration.

---

## REST API

For deeper integrations — managing artist profiles, handling purchases, accessing user data — Mirlo exposes a full REST API.

Interactive API documentation is available at **[mirlo.space/docs](https://mirlo.space/docs)** (Swagger/OpenAPI).

### Getting an API key

API keys are scoped to a registered client application.

- **On mirlo.space:** Email [hi@mirlo.space](mailto:hi@mirlo.space) to request a key. Include a brief description of what you're building.
- **Self-hosted instances:** You can issue a key directly by editing the `client` table in the database.

### Acting on behalf of a user

To read or change a user's data, don't ask for their password. Use [Sign in with Mirlo](./oauth.md), a standard OAuth 2.1 / OpenID Connect flow. Apps that identify themselves with a Client ID Metadata Document can connect to any Mirlo instance once that instance's admins approve them, with no key needed.

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
