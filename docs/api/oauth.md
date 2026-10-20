# Sign in with Mirlo (OAuth 2.1 / OpenID Connect)

Apps can ask a Mirlo user for access to their account instead of asking for their password. Mirlo is a standard OAuth 2.1 authorization server and OpenID Connect provider, so most OAuth libraries work without changes.

Every Mirlo instance is its own authorization server. A token from one instance only works on that instance.

## Discovery

Given an instance's address, fetch its metadata:

```
GET https://{instance}/.well-known/openid-configuration
GET https://{instance}/.well-known/oauth-authorization-server
```

Both return the same document: the issuer (the instance root), the authorization, token, revocation, userinfo and JWKS endpoints (all under `/oidc/`), and the supported scopes.

## Identifying your app

There are two ways to identify your app.

### A Client ID Metadata Document (recommended)

Host a JSON document over HTTPS and use its URL as your `client_id`. Any instance can then look up your app without you registering on it first. This is the right choice for mobile and desktop apps, and for anything that connects to more than one instance.

```json
{
  "client_id": "https://myapp.example/oauth/client.json",
  "client_name": "My App",
  "client_uri": "https://myapp.example",
  "logo_uri": "https://myapp.example/logo.png",
  "redirect_uris": ["myapp://oauth/callback"],
  "application_type": "native",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

- `client_id` must be exactly the document's own URL.
- The document can't contain a client secret. Apps identified this way are public clients and always use PKCE.
- Use `application_type: "native"` for custom URL schemes (`myapp://…`) or loopback redirects (`http://127.0.0.1:{port}/…`).
- Keep the document under 5 KB. Instances cache it for between 30 seconds and a day, following your `Cache-Control` header.

**Each instance approves apps.** The first time someone on an instance tries to connect your app, they see a page saying it isn't approved there yet, with a button to ask the instance's admins to approve it. Until an admin approves it, the instance doesn't issue your app any tokens, and "Back to My App" returns `error=access_denied` to your redirect URI. Handle that error by telling the user the app is waiting for approval on their instance.

### A registered client

An instance admin can register your app in **Admin → API clients** with its redirect URIs. Use this for server-side apps (a WordPress plugin, a forum or feedback board using single sign-on). Your `client_id` is the client's numeric ID.

If "Keeps its key on a server" is ticked, the client is confidential. It authenticates at the token endpoint with HTTP Basic auth (`client_secret_basic`): `client_id` as the username, and the client's API key as the password. Otherwise the client is public, with no secret.

## The authorization code flow

All clients use the authorization code flow with PKCE (`S256`). Other response types, the implicit flow and the password grant aren't supported.

1. Make a random `code_verifier` and its `code_challenge` (`BASE64URL(SHA256(verifier))`).
2. Send the user's browser to the authorization endpoint:

   ```
   https://{instance}/oidc/auth
     ?client_id=…
     &response_type=code
     &redirect_uri=myapp://oauth/callback
     &scope=openid profile api offline_access
     &prompt=consent
     &state=…
     &code_challenge=…
     &code_challenge_method=S256
   ```

   Native apps should use the system browser session (`ASWebAuthenticationSession`, Custom Tabs, `expo-auth-session` or AppAuth), not an embedded web view. Mirlo's pages can't be shown in a frame.

3. The user logs in to Mirlo if they need to, and sees which app is asking and for what. Mirlo remembers the answer and only asks again when your app asks for more scopes, or sends `prompt=consent`.
4. Mirlo redirects to `redirect_uri` with `code`, `state` and `iss`. Check that `state` matches and that `iss` is the instance you started with.
5. Exchange the code at the token endpoint:

   ```
   POST https://{instance}/oidc/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&code=…&redirect_uri=…&code_verifier=…&client_id=…
   ```

   Confidential clients send Basic auth instead of `client_id` in the body.

The response has an `access_token` (valid for an hour), an `id_token` if you asked for `openid`, and a `refresh_token` if you asked for `offline_access`.

## Scopes

| Scope              | Gives your app                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openid`           | An ID token, and the user's ID (`sub`) from `/oidc/me`                                                                                                |
| `profile`          | The user's name                                                                                                                                       |
| `email`            | The user's email address and `email_verified`                                                                                                         |
| `api`              | Use the REST API as the user. See [What `api` tokens can do](#what-api-tokens-can-do).                                                                |
| `subscribers:read` | `GET /v1/manage/artists/{artistId}/subscribers/active` for artists the user can edit. Add `?paid=true` to leave out people who only follow the artist |
| `offline_access`   | A refresh token. OpenID Connect only honours it together with `prompt=consent`.                                                                       |

Ask for the fewest scopes your app needs. The consent screen warns people strongly about `api`.

Users whose email address isn't verified can't connect apps: the flow ends with `error=access_denied`.

## Calling the API

Send the access token as a bearer token:

```
GET https://{instance}/v1/...
Authorization: Bearer {access_token}
```

A bearer token replaces the `mirlo-api-key` header: an approved app doesn't need a key as well. If you do send a key, the key decides which client the request is attributed to.

Errors follow RFC 6750:

- `401` with `WWW-Authenticate: Bearer error="invalid_token"`: the token expired, was revoked, the app was blocked on the instance, or the user's account was disabled. Refresh it, or start the flow again.
- `403` with `error="insufficient_scope", scope="…"`: the route needs a scope your token doesn't have.

To stream audio as the user, send the same `Authorization` header on the HLS manifest (`/v1/tracks/{id}/stream/playlist.m3u8`) and on every segment request. Without it, segments of tracks that aren't previews return `404`.

### What `api` tokens can do

An `api` token can read anything the user can, except the list of connected apps and the Stripe onboarding link. It can make most of the changes the user can, such as following artists, buying things, and managing releases, posts and merch. Changes that aren't open to apps return `403` and have to be done while signed in on the site. Apps can't:

- change account settings, or delete the account or an artist
- change payouts or connect Stripe
- charge a fundraiser's pledges
- add or remove an artist's managers or labels, or accept manager invites
- connect or disconnect other apps
- use admin endpoints

## Refreshing and revoking

Refresh with `grant_type=refresh_token`. Public clients get a new refresh token each time, and the old one stops working; using an old one again revokes the whole grant.

When the user signs out of your app, revoke the refresh token at `POST /oidc/token/revocation`.

Users see and disconnect connected apps under **Account settings → Connected apps**. Disconnecting an app, or resetting the password, revokes its tokens immediately.
