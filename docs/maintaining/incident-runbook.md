---
title: Security incident runbook
editLink: true
---

# Security incident runbook

Use this page when you think an account, a secret or the code has been compromised on the main instance (mirlo.space, hosted on Render). Self-hosters can follow the same steps: swap "Render" for your host.

For outages that aren't security incidents (DNS weirdness, a scheduled task stuck in a loop), see [Rapid response](./rapid-response.md).

This page names where secrets live. It never contains secret values, and it must not.

## 1. First 15 minutes

### Tell someone

- Main contact: `TODO: fill in name + how to reach them`
- Backup contact: `TODO: fill in`
- Open a **private** channel for the incident (not a public GitHub issue).

### Contain

Pick what fits. Each step can be undone.

| Situation                              | Do this                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One user account is misbehaving        | Admin → Users → the user → **Disabled**. This sets `User.disabledAt`, which makes the API reject their sessions, logins and OAuth tokens.                                                                                                                                                                  |
| Log one user out everywhere            | `UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE id = <id>;` Every session cookie for that user stops working immediately. A password reset does the same thing.                                                                                                                               |
| Log **everyone** out                   | `UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1;` Or rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (see [secrets](#_3-secrets-inventory)).                                                                                                                                                         |
| Remove someone's admin rights          | Admin → Users → the user → untick admin. Or: `UPDATE "User" SET "isAdmin" = false WHERE id = <id>;`                                                                                                                                                                                                        |
| Stop new artist profiles being created | Set the defcon level to 2 in Admin → Settings, or `UPDATE "Settings" SET "defconLevel" = 2;`. Users without "can create artists" then can't create profiles. Sign-ups themselves still work. Levels 1 and 3 currently do nothing (the rate limiter in `src/rateLimiter.ts` that reads them isn't mounted). |
| Attack traffic / scraping              | Turn on Cloudflare "Under Attack" mode for the zone, or add a WAF rule. Read the WAF gotchas in [mirlo-edge-serving](https://github.com/funmusicplace/mirlo/blob/main/.claude/skills/mirlo-edge-serving/SKILL.md) first: a careless rule blocks Stripe webhooks and federation.                            |
| The running code itself is malicious   | Suspend the `api` and `background` services in Render. This takes the site down; only do it when keeping it up is worse.                                                                                                                                                                                   |

Run SQL with `psql` against the database. The database only accepts internal connections, so either use a Render shell on the `api` service or temporarily add your IP to the database's allow-list in the Render dashboard, and remove it afterwards.

### Preserve evidence

- Render keeps logs for a limited time (check the plan's retention in the dashboard). **Export or copy the relevant logs now**, before anything else rolls them away.
- Search them for `security-alert`. Every security-relevant admin action writes one (see [section 6](#_6-security-alert-emails)).
- Check every admin's inbox for "Security alert on …" emails.
- Write down times (UTC), user ids, IPs and what you changed, as you go.

## 2. Accounts

Each account below can take Mirlo down or take it over on its own. Every one should have MFA and a second admin.

| Account                        | Controls                                               | If compromised                                                                                                                   | Owner / backup admin | MFA on? |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------- |
| **Render**                     | API, worker, Umami, Postgres, Redis, env vars, deploys | Everything: every secret, a database shell, deploying arbitrary code                                                             | `TODO: fill in`      | `TODO`  |
| **GitHub org `funmusicplace`** | The code. Render auto-deploys `main`                   | Arbitrary code running in production with all production secrets (the Render build runs `yarn install` and migrations with them) | `TODO: fill in`      | `TODO`  |
| **Cloudflare**                 | DNS, proxy, WAF, cache rules                           | Redirect `mirlo.space`: phish logins, intercept payments, break federation                                                       | `TODO: fill in`      | `TODO`  |
| **Domain registrar**           | The `mirlo.space` domain itself                        | Same as Cloudflare, and could transfer the domain away                                                                           | `TODO: fill in`      | `TODO`  |
| **Backblaze B2**               | All audio, images and download zips                    | Delete or replace every file; there is no backup yet                                                                             | `TODO: fill in`      | `TODO`  |
| **Stripe (platform account)**  | Payments, Connect accounts, payouts                    | Money                                                                                                                            | `TODO: fill in`      | `TODO`  |
| **Email provider**             | Transactional email                                    | Send email as Mirlo; read who gets which email                                                                                   | `TODO: fill in`      | `TODO`  |
| **Transifex**                  | Translations                                           | Inject text (including links) into every language of the site                                                                    | `TODO: fill in`      | `TODO`  |
| **Umami**                      | Analytics (own login at the Umami service)             | Read analytics. Since it runs in its own `umami` Postgres role, it can't read Mirlo's data                                       | `TODO: fill in`      | `TODO`  |

## 3. Secrets inventory

Where things live:

- **Render env group `blackbrd`**: shared by the `api` and `background` services.
- **Render-managed**: `DATABASE_URL`, `REDIS_HOST`/`REDIS_PORT` (wired in `render.yaml`).
- **Settings row**: the single row in the `Settings` table, edited through Admin → Settings. The API returns these masked, but **they are stored in plain text in the database**.
- **GitHub Actions secrets**: only for CI. None of them reach production.

> **A database dump contains the Stripe secret key, the Stripe webhook secret, the email provider's API keys, the Turnstile secret, every app's API key, the OAuth signing keys and every artist's ActivityPub private key, all in plain text.** A leaked dump or backup means rotating all of those (see [scenario 4.3](#_4-3-a-database-dump-or-backup-leaked)).

| Secret                                              | Stored in                                                                                                                                                   | How to rotate                                                                                                                                                        | Side effects                                                                                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                                        | Env group                                                                                                                                                   | Set a new long random value, redeploy `api` and `background`                                                                                                         | Logs everyone out. Also invalidates unsubscribe links in emails already sent and active external stream playtokens (`src/utils/unfollowToken.ts`, `src/routers/v1/tracks/{id}/stream/external/`). |
| `REFRESH_TOKEN_SECRET`                              | Env group                                                                                                                                                   | Same, rotate together with `JWT_SECRET`                                                                                                                              | Logs everyone out.                                                                                                                                                                                |
| Stripe secret key                                   | **Both** env `STRIPE_KEY` and `Settings.settings.stripe.key`. The Settings value wins when present (`refreshStripeClient()` in `src/utils/stripe/index.ts`) | Roll the key in the Stripe dashboard. Paste it into Admin → Settings (takes effect on save, no restart). Also update `STRIPE_KEY` so the fallback isn't the old key. | Brief payment failures between rolling and saving. If you edit it via SQL instead of Admin → Settings, restart `api`: the client is only refreshed on boot or on save.                            |
| Stripe Connect webhook signing secret               | `Settings.settings.stripe.webhookConnectSigningSecret` (env `STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET` is the fallback)                                        | Roll the endpoint's secret in the Stripe dashboard, paste it into Admin → Settings                                                                                   | Webhooks fail verification until saved; Stripe retries, then resend failed events (see [4.8](#_4-8-stripe-webhooks-failing)).                                                                     |
| Email provider API key / SMTP password              | `Settings.settings.emailProvider.<provider>` (and env `SENDGRID_API_KEY` as a fallback, plus `SENDGRID_WEBHOOK_PUBLIC_KEY`)                                 | Create a new key at the provider, paste into Admin → Settings, delete the old key at the provider                                                                    | None if done in that order.                                                                                                                                                                       |
| Cloudflare Turnstile secret                         | `Settings.settings.cloudflareTurnstileSecret`, falling back to env `CLOUDFLARE_TURNSTILE_API_SECRET`                                                        | Rotate in the Cloudflare dashboard, paste into Admin → Settings                                                                                                      | Sign-ups fail until saved.                                                                                                                                                                        |
| B2 application key                                  | Env `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`                                                                                                             | Create a new key in Backblaze (scoped to Mirlo's buckets, not the master key), set the env vars, redeploy, then delete the old key                                   | Uploads/downloads fail between deleting the old key and the redeploy, so delete it last.                                                                                                          |
| Database password                                   | Render-managed (`DATABASE_URL`)                                                                                                                             | Check in the Render dashboard whether the credential can be rotated; redeploy `api` and `background` after                                                           | Brief downtime.                                                                                                                                                                                   |
| `umami` Postgres role password                      | Umami's `DATABASE_URL`                                                                                                                                      | `ALTER ROLE umami PASSWORD '<new>';` then update Umami's `DATABASE_URL` and redeploy it                                                                              | Analytics stop until redeployed.                                                                                                                                                                  |
| Umami `APP_SECRET`                                  | Umami service env (generated by Render)                                                                                                                     | Set a new value, redeploy Umami                                                                                                                                      | Logs out Umami users.                                                                                                                                                                             |
| OAuth signing keys + interaction cookie keys        | `OAuthKey` table (`kind = 'jwks'` and `'cookies'`), created on first boot (`src/auth/oidc/keys.ts`)                                                         | `DELETE FROM "OAuthKey";` then restart `api`; new keys are generated                                                                                                 | Third-party apps' issued tokens may stop validating; users may need to reconnect apps.                                                                                                            |
| App API keys (`mirlo-api-key`)                      | `Client.key`, plain text                                                                                                                                    | Rotate the client's key from Admin → Clients (`PUT /v1/admin/clients/{id}` with `rotateKey`), or revoke the client                                                   | That app breaks until it's given the new key.                                                                                                                                                     |
| ActivityPub keypairs                                | Per artist: `Profile.apPrivateKey` / `apPublicKey`                                                                                                          | Only if leaked: `UPDATE "Profile" SET "apPublicKey" = NULL, "apPrivateKey" = NULL WHERE id = <id>;` New keys are generated on next use                               | Remote servers cache the old public key, so the artist's posts may be rejected until they refetch it. Don't do this unless the key leaked.                                                        |
| Transifex tokens                                    | Env `TRANSIFEX_API_TOKEN` (API, reads language list); GitHub secrets `TRANSIFEX_TOKEN`, `TRANSIFEX_SECRET` (CI push/pull)                                   | Regenerate in Transifex, update both places                                                                                                                          | Translation sync stops until updated. `VITE_TRANSIFEX_TOKEN` is a public client token, not a secret.                                                                                              |
| `AUDD_IO_TOKEN`, `BASECAMP_CHATBOT_URL`             | Env group                                                                                                                                                   | Regenerate at AudD / Basecamp, update env                                                                                                                            | Audio verification / admin chat notifications pause.                                                                                                                                              |
| GitHub Actions `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | GitHub secrets                                                                                                                                              | Only used by Cypress in CI                                                                                                                                           | None in production.                                                                                                                                                                               |

## 4. Scenarios

### 4.1 An admin account is compromised

1. Disable the account (Admin → Users, or `UPDATE "User" SET "disabledAt" = now() WHERE id = <id>;`) and bump its `tokenVersion`.
2. Look at the `security-alert` logs and emails for what that account did: settings changes, new admins, logins as other users, 2FA changes.
3. Revert settings changes. If the Stripe key, email provider or bucket names were changed, assume the attacker had full control of them and rotate.
4. Remove any admin rights the attacker granted. Check the full list: `SELECT id, email FROM "User" WHERE "isAdmin";`
5. If they logged in as other users, contact those users and bump their `tokenVersion`.
6. Before re-enabling, reset the owner's password and 2FA (see [section 5](#_5-admin-two-factor-authentication)) after confirming who they are out-of-band.

### 4.2 The Render account is compromised

Assume every secret in [section 3](#_3-secrets-inventory) is known to the attacker, and that the database was read.

1. Recover the account (Render support, account recovery). Once in: remove unknown team members, API keys and deploy hooks; turn MFA back on.
2. Check recent deploys, env var changes, and whether the deployed commit matches `main` on GitHub.
3. Rotate **every** secret in section 3, starting with Stripe and email.
4. Follow [4.3](#_4-3-a-database-dump-or-backup-leaked) for the data.
5. Check that B2 still has its files and Cloudflare/DNS still points at Render.

### 4.3 A database dump or backup leaked

1. Rotate: Stripe secret key, Stripe webhook secret, email provider keys, Turnstile secret, OAuth keys, app API keys. `JWT_SECRET` / `REFRESH_TOKEN_SECRET` aren't in the database, so a dump alone doesn't need them rotated; do rotate them if env vars may have leaked too.
2. Passwords are bcrypt-hashed, but force a reset for admins at least.
3. The dump contains users' emails and purchase history: this is a personal data breach. `TODO: fill in who decides on notifying users / authorities and the deadline that applies.`

### 4.4 The Stripe key leaked

1. Roll it in the Stripe dashboard and update Admin → Settings and `STRIPE_KEY` (see section 3).
2. A platform key can act on connected accounts. In the Stripe dashboard, review recent API requests, refunds, payouts and changes to connected accounts.
3. Contact Stripe support if anything was moved.

### 4.5 Malicious code reached `main`

Render auto-deploys `main`, and the build (`yarn install`, `prisma migrate deploy`) runs with all production secrets. This covers a bad merge, a compromised GitHub account and a compromised npm dependency (install scripts run during the build).

1. Turn off auto-deploy in Render, then roll back to the last known-good deploy from the Render dashboard.
2. Find the bad commit or dependency (`git log`, diff `yarn.lock`), revert it on `main`.
3. Assume the build leaked every env var: rotate everything in section 3 that lives in env or in the database (the build has `DATABASE_URL`).
4. If a migration ran, check the database for changes it made.
5. If a GitHub account was used: remove it from the org, review org members, deploy keys and installed apps.

### 4.6 A B2 key leaked, or media was deleted

1. Create a new scoped key, deploy it, delete the leaked one (see section 3).
2. Check the buckets (`mirlo-audio`, `mirlo-images`, `mirlo-downloads`) for deleted or replaced files. Check in the Backblaze dashboard whether earlier file versions were kept.
3. There's no backup of media yet (see [section 7](#_7-backups-and-restore)), so deleted files may be gone. Artists may need to re-upload.

### 4.7 DNS or Cloudflare hijacked

1. Recover the Cloudflare and registrar accounts; check DNS records, page rules and workers against what's expected (API hostname proxied to Render).
2. While DNS was wrong, logins could have been phished: rotate `JWT_SECRET` / `REFRESH_TOKEN_SECRET` and ask users to reset passwords if it lasted more than a few minutes.
3. Check Stripe webhooks were still delivered (4.8).

### 4.8 Stripe webhooks failing

A blocked or failing webhook means people get charged but don't get what they bought.

1. Stripe dashboard → Developers → Webhooks → the Connect endpoint → delivery attempts. Look at the response codes.
2. A 403 HTML response usually means Cloudflare blocked it: check Security → Events and exempt `/v1/webhooks/` (see [mirlo-edge-serving](https://github.com/funmusicplace/mirlo/blob/main/.claude/skills/mirlo-edge-serving/SKILL.md)).
3. A 400 "signature" error means the signing secret doesn't match: re-save it in Admin → Settings.
4. Stripe retries for about 3 days. After that, resend failed events from the dashboard and cross-check recent charges against purchases in the database.

## 5. Admin two-factor authentication

Admin powers (admin pages, editing any artist, logging in as other users) only switch on after the admin has verified a second factor in that browser session. The verification is recorded in the session token (claim `mfaAt`) and lasts 12 hours. Logging in alone gives an admin the same powers as a normal user.

Factors:

- Security keys and passkeys (table `"WebAuthnCredential"`)
- An authenticator app (`User."totpSecret"`)
- One-time recovery codes, given when the first factor is added (table `"UserRecoveryCode"`)

### An admin is locked out

There's no UI for one admin to reset another's 2FA yet. **First confirm who they are out-of-band** (a call, not just an email): with no factors left, setting up a new one only needs a logged-in session, so whoever controls the account at that point becomes its second factor.

Then, for user id `<id>`:

```sql
DELETE FROM "WebAuthnCredential" WHERE "userId" = <id>;
DELETE FROM "UserRecoveryCode" WHERE "userId" = <id>;
UPDATE "User"
SET "totpSecret" = NULL,
    "totpPendingSecret" = NULL,
    "totpLastUsedStep" = NULL,
    "tokenVersion" = "tokenVersion" + 1
WHERE id = <id>;
```

They log in again and are asked to set up a factor the next time they open `/admin`.

## 6. Security alert emails

Every admin gets an email, and the API logs a `security-alert` line, when:

| Alert                                           | Means                                                        | If you didn't expect it                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Instance settings changed                       | Someone saved Admin → Settings; the email lists which fields | Check which fields. Stripe key, email provider or bucket changes: treat as [4.1](#_4-1-an-admin-account-is-compromised). |
| Someone was made admin / lost admin             | Admin → Users changed `isAdmin`                              | Revert it, then 4.1 for the admin who did it.                                                                            |
| An admin logged in as another user              | Admin → Users → "log in as"                                  | Ask the admin. If they didn't, 4.1, and contact the impersonated user.                                                   |
| A security key or authenticator app was added   | An admin added a 2FA factor                                  | If it wasn't them, an attacker has a verified admin session: 4.1, then remove the factor.                                |
| A security key or authenticator app was removed | An admin removed a 2FA factor                                | Same as above.                                                                                                           |
| Recovery codes regenerated                      | An admin replaced their recovery codes                       | Same as above.                                                                                                           |
| A recovery code was used                        | An admin verified with a recovery code instead of a key/app  | Fine if they lost their key. Otherwise their codes leaked: 4.1.                                                          |

## 7. Backups and restore

Current state:

- **Postgres**: Render's point-in-time recovery. It lives inside the Render account, so it is lost if the account is lost or deleted. Check the retention window in the dashboard.
- **Off-Render database backup**: **TODO, not set up.** Plan: a nightly `pg_dump` to a bucket in a _separate_ Backblaze account, with Object Lock on so it can't be deleted with the main account's keys.
- **Media (B2)**: **TODO, no backup.** Plan: keep file versions and/or B2 Cloud Replication to a second account.
- **Redis**: holds only queue state; losing it loses pending jobs, not data.

Remember: backups contain all the secrets listed in section 3. Treat them as sensitive as the Stripe key.

### Taking a dump by hand

```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > mirlo-$(date +%Y%m%d).dump
```

### Restoring

Restore into a **new, empty** database, never over production, then point the services at it once it's checked.

```bash
createdb -h <host> -U <user> mirlo_restore
pg_restore --no-owner --no-acl --dbname="postgres://<user>:<password>@<host>/mirlo_restore" mirlo-YYYYMMDD.dump
```

For Render's point-in-time recovery, follow the restore option on the database's page in the dashboard; it creates a separate database.

### Restore drill (do this once a quarter)

1. Take a dump (or download the latest off-Render backup once it exists).
2. Restore it into a throwaway Postgres, not your dev database, using the same major version as production (check it in the Render dashboard): `docker run --rm -d --name mirlo-restore -p 5440:5432 -e POSTGRES_PASSWORD=restore postgres:<major>`, then `pg_restore` as above against `localhost:5440`.
3. **Before starting anything against it**, strip the live credentials so a local API can't charge cards or email real users: `UPDATE "Settings" SET settings = settings - 'stripe' - 'emailProvider';`. Don't run the `background` worker against it.
4. Point a local API at it (`DATABASE_URL`), run `yarn prisma:migrate:deploy`, start it, log in and load an artist page. The restored copy holds real user data and live secrets: delete it (`docker stop mirlo-restore`) when done.
5. Write down how long it took and anything that didn't work.

## 8. After the incident

- [ ] Every secret that could have been exposed is rotated (section 3), and old keys are deleted at the provider.
- [ ] Every `security-alert` log line and email from the incident window has been reviewed.
- [ ] Stripe charges in the window match purchases in the database; failed webhooks have been resent.
- [ ] Admin list (`SELECT id, email FROM "User" WHERE "isAdmin";`) and Render/GitHub/Cloudflare members are as expected.
- [ ] Temporary measures are undone: defcon level, IP allow-lists, Under Attack mode, suspended services.
- [ ] A write-up exists: what happened, timeline, what you changed, what to fix. Post it as a GitHub issue once it's safe to make public, and update this page with anything that was missing.
