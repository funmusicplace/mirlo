# Setting up Sign in with Mirlo

This page walks through getting an app talking to Mirlo over OAuth, first against a Mirlo instance running on your own machine, then against a real one. For the full reference (scopes, errors, what tokens can do), see [Sign in with Mirlo](./oauth.md).

## What you need

- A Mirlo instance. To run one locally, follow the setup in the [README](https://github.com/funmusicplace/mirlo#readme): `docker compose watch` for the API, `yarn prisma:seed` for test data, and `yarn client:start` for the frontend.
- An account on it with a verified email address. The seeded `admin@admin.example` (password `test1234`) works, and is also an admin.

The instance needs no extra configuration for OAuth. It makes its signing keys the first time it starts and keeps them in the database (the `OAuthKey` table).

Locally, the authorization server lives on the API at `http://localhost:3000`, and the sign-in and consent pages on the frontend at `http://localhost:8080`. You can check it's up with:

```sh
curl http://localhost:3000/.well-known/openid-configuration
```

## 1. Register your app

On a local instance, the quickest way is to register your app as a client:

1. Sign in as an admin and go to **Admin → API clients** (`/admin/clients`).
2. Create a client with your app's name and URL. Leave the CORS origins empty unless your app calls the API from a browser.
3. In the client's **OAuth** column, add your redirect URIs, comma separated. Leave **Keeps its key on a server** unticked unless your app has a backend that can keep a secret.
4. Note the **Client ID** shown there. It's a number, and it's your `client_id`.

New clients are approved straight away. A client whose status is `pending` or `revoked` can't get tokens.

Some redirect URIs that work for testing:

| Redirect URI                     | When to use it                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `http://localhost:5173/callback` | A web app running on a dev server                                                                 |
| `http://127.0.0.1:8765/callback` | A desktop or CLI app with a loopback listener, or trying the flow by hand (nothing has to listen) |
| `myapp://oauth/callback`         | A mobile app with a custom URL scheme                                                             |

The redirect URI your app sends must match one of these exactly.

## 2. Try the flow by hand

Before wiring up a library, it can help to see each step work with `curl`. This uses a public client with the redirect URI `http://127.0.0.1:8765/callback`, and assumes its client ID is `2`.

Make a PKCE verifier and challenge:

```sh
VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
CHALLENGE=$(printf %s "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '=')
```

Open the authorization URL in your browser:

```sh
echo "http://localhost:3000/auth/oidc/auth?client_id=2&response_type=code&redirect_uri=http://127.0.0.1:8765/callback&scope=openid%20profile%20api%20offline_access&prompt=consent&state=xyz&code_challenge=$CHALLENGE&code_challenge_method=S256"
```

Mirlo sends you to `http://localhost:8080/auth/oauth/…`. Sign in, and allow the app. Your browser is then sent to the redirect URI. Nothing is listening there, so the page won't load, but the address bar has the code:

```
http://127.0.0.1:8765/callback?code=…&state=xyz&iss=http%3A%2F%2Flocalhost%3A3000
```

The code is valid for one minute. Exchange it for tokens:

```sh
curl http://localhost:3000/auth/oidc/token \
  -d grant_type=authorization_code \
  -d code=PASTE_THE_CODE \
  -d redirect_uri=http://127.0.0.1:8765/callback \
  -d code_verifier=$VERIFIER \
  -d client_id=2
```

For a confidential client, drop `client_id` and send the client's key as the secret instead: `curl -u 2:THE_CLIENT_KEY …`.

Then call the API with the access token:

```sh
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/auth/oidc/me
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/v1/manage/artists
```

The first returns who signed in. The second lists their artists, and needs the `api` scope.

Your app is now connected under **Account settings → Connected apps**, where you can disconnect it to check how your app handles a revoked token.

## 3. Use a library

Point any OAuth 2.1 or OpenID Connect library at the instance's discovery document, and configure it with:

- your `client_id` and redirect URI
- PKCE with `S256` (required)
- the scopes you need (see [Scopes](./oauth.md#scopes))

Some that work: [AppAuth](https://appauth.io/) for iOS and Android, [`expo-auth-session`](https://docs.expo.dev/versions/latest/sdk/auth-session/) for Expo, [`openid-client`](https://github.com/panva/openid-client) for Node, and [Authlib](https://docs.authlib.org/) for Python.

Use the system browser for the sign-in step, not an embedded web view. Mirlo's pages can't be shown in a frame.

## 4. Move to a Client ID Metadata Document

A registered client only exists on the instance where it was registered. If your app should work with any Mirlo instance, identify it with a [Client ID Metadata Document](./oauth.md#a-client-id-metadata-document-recommended) instead: a JSON file you host, whose URL is your `client_id`.

The document's URL must be HTTPS, so you can't serve it from `localhost`. To test with a local instance, host it somewhere public, such as GitHub Pages, and use that URL as `client_id`. Your redirect URIs can still point at your machine.

The first time you connect, Mirlo shows a page saying the app isn't approved yet. Ask for approval there, then, as an admin, set the new client's status to `approved` in **Admin → API clients**. If the instance has a contact email set in **Admin → Settings**, admins are emailed when someone asks. Locally, that email shows up in MailHog at `http://localhost:8025`.

Every instance approves apps separately, so on a real instance you'll be waiting for its admins. Make sure your app handles `error=access_denied` in the meantime.

## Running OAuth on your own instance

If you host a Mirlo instance, OAuth works out of the box, as long as:

- `API_DOMAIN` is the instance's public address, such as `https://music.example`. It's the issuer in every token, and apps check it.
- `CLIENT_DOMAIN` is where the frontend is served. On a deployed instance that's the same as `API_DOMAIN`. `scripts/generate-env.sh` sets both for you.
- The contact email is set in **Admin → Settings**, so you hear about apps asking for approval.

Approve, block, or remove apps in **Admin → API clients**. Setting an app back to `pending` or `revoked`, or deleting it, signs it out of every account straight away.
