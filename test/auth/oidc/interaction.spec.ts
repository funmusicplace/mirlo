import assert from "assert";

import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";
dotenv.config();

import { clearTables, createUser } from "../../utils";

import {
  API,
  REDIRECT_URI,
  authorizeAndAllow,
  createOAuthClient,
  decide,
  exchangeCode,
  pathOf,
  pkce,
  signIn,
  signOut,
  startAuthorization,
} from "./utils";

describe("oidc interaction", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const verifiedUser = () =>
    createUser({
      email: "fan@example.com",
      name: "A Fan",
      emailConfirmationToken: null,
    });

  it("describes the request to a logged-out visitor", async () => {
    const client = await createOAuthClient({ applicationName: "Fider" });
    const agent = request.agent(API);
    const { uid } = await startAuthorization(
      agent,
      client.id,
      pkce().challenge
    );

    const response = await agent.get(`/oauth/${uid}/details`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.result, {
      client: { name: "Fider", uri: "https://app.example", logoUri: null },
      redirectHost: "app.example",
      scopes: ["openid", "profile", "email"],
      loggedIn: false,
      needsConsent: true,
    });
  });

  it("refuses to allow without a Mirlo session", async () => {
    const client = await createOAuthClient();
    const agent = request.agent(API);
    const { uid } = await startAuthorization(
      agent,
      client.id,
      pkce().challenge
    );

    const response = await decide(agent, uid!, "allow");
    assert.equal(response.status, 401);
  });

  it("404s on an unknown interaction", async () => {
    const response = await request(API).get("/oauth/nope/details");
    assert.equal(response.status, 404);
  });

  it("runs the code flow for a confidential client using its key as the secret", async () => {
    const { user, accessToken } = await verifiedUser();
    const client = await createOAuthClient();
    const agent = request.agent(API);
    signIn(agent, accessToken);
    const { verifier, challenge } = pkce();

    const callback = await authorizeAndAllow(agent, client.id, challenge);
    assert.equal(callback.origin + callback.pathname, REDIRECT_URI);
    assert.equal(callback.searchParams.get("state"), "some-state");
    assert.equal(callback.searchParams.get("iss"), API);
    const code = callback.searchParams.get("code")!;

    const token = await exchangeCode(client, code, verifier);
    assert.equal(token.status, 200, token.text);
    assert.ok(token.body.access_token);
    assert.ok(token.body.id_token);
    assert.equal(token.body.refresh_token, undefined);

    const me = await request(API)
      .get("/oidc/me")
      .set("Authorization", `Bearer ${token.body.access_token}`);
    assert.deepEqual(me.body, {
      sub: String(user.id),
      name: "A Fan",
      email: "fan@example.com",
      email_verified: true,
    });

    const reuse = await exchangeCode(client, code, verifier);
    assert.equal(reuse.status, 400);
    assert.equal(reuse.body.error, "invalid_grant");
  });

  it("refuses a wrong secret or a wrong code verifier", async () => {
    const { accessToken } = await verifiedUser();
    const client = await createOAuthClient();
    const agent = request.agent(API);
    signIn(agent, accessToken);
    const { verifier, challenge } = pkce();
    const code = (
      await authorizeAndAllow(agent, client.id, challenge)
    ).searchParams.get("code")!;

    const wrongSecret = await exchangeCode(
      { id: client.id, key: "not-the-key" },
      code,
      verifier
    );
    assert.equal(wrongSecret.status, 401);
    assert.equal(wrongSecret.body.error, "invalid_client");

    const wrongVerifier = await exchangeCode(client, code, pkce().verifier);
    assert.equal(wrongVerifier.status, 400);
    assert.equal(wrongVerifier.body.error, "invalid_grant");
  });

  it("remembers consent and asks again only when the scopes grow", async () => {
    const { accessToken } = await verifiedUser();
    const client = await createOAuthClient();
    const agent = request.agent(API);
    signIn(agent, accessToken);

    await authorizeAndAllow(agent, client.id, pkce().challenge, {
      scope: "openid profile",
    });

    const again = await startAuthorization(agent, client.id, pkce().challenge, {
      scope: "openid profile",
    });
    const details = await agent.get(`/oauth/${again.uid}/details`);
    assert.equal(details.body.result.needsConsent, false);

    const more = await startAuthorization(agent, client.id, pkce().challenge);
    const moreDetails = await agent.get(`/oauth/${more.uid}/details`);
    assert.equal(moreDetails.body.result.needsConsent, true);
  });

  it("checks the Mirlo session on every authorization", async () => {
    const { accessToken } = await verifiedUser();
    const client = await createOAuthClient();
    const agent = request.agent(API);
    signIn(agent, accessToken);
    await authorizeAndAllow(agent, client.id, pkce().challenge);

    signOut(agent);
    const { response, uid } = await startAuthorization(
      agent,
      client.id,
      pkce().challenge
    );
    assert.equal(response.status, 303);
    assert.ok(uid, "went to the interaction instead of issuing a code");
    const details = await agent.get(`/oauth/${uid}/details`);
    assert.equal(details.body.result.loggedIn, false);
  });

  it("sends access_denied back to the app when the user denies", async () => {
    const { accessToken } = await verifiedUser();
    const client = await createOAuthClient();
    const agent = request.agent(API);
    signIn(agent, accessToken);
    const { uid } = await startAuthorization(
      agent,
      client.id,
      pkce().challenge
    );

    const decision = await decide(agent, uid!, "deny");
    const resume = await agent.get(pathOf(decision.body.result.redirectTo));
    const callback = new URL(resume.headers.location);
    assert.equal(callback.origin + callback.pathname, REDIRECT_URI);
    assert.equal(callback.searchParams.get("error"), "access_denied");
    assert.equal(callback.searchParams.get("code"), null);
  });

  it("sends access_denied for an account whose email isn't verified", async () => {
    const { accessToken } = await createUser({ email: "new@example.com" });
    const client = await createOAuthClient();
    const agent = request.agent(API);
    signIn(agent, accessToken);
    const { uid } = await startAuthorization(
      agent,
      client.id,
      pkce().challenge
    );

    const decision = await decide(agent, uid!, "allow");
    const resume = await agent.get(pathOf(decision.body.result.redirectTo));
    const callback = new URL(resume.headers.location);
    assert.equal(callback.searchParams.get("error"), "access_denied");
  });
});
