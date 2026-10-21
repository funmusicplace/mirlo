import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";
dotenv.config();

import { clearTables } from "../../utils";

import {
  API,
  REDIRECT_URI,
  authorizeParams,
  createOAuthClient,
  pkce,
  startAuthorization,
} from "./utils";

describe("oidc provider", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("serves discovery at the instance root with the root as issuer", async () => {
    for (const path of [
      "/.well-known/openid-configuration",
      "/.well-known/oauth-authorization-server",
      "/auth/oidc/.well-known/openid-configuration",
    ]) {
      const response = await request(API).get(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.body.issuer, API);
      assert.equal(
        response.body.authorization_endpoint,
        `${API}/auth/oidc/auth`
      );
      assert.equal(response.body.token_endpoint, `${API}/auth/oidc/token`);
      assert.deepEqual(response.body.response_types_supported, ["code"]);
      assert.deepEqual(response.body.code_challenge_methods_supported, [
        "S256",
      ]);
    }
  });

  it("publishes only the public half of the signing key", async () => {
    const response = await request(API).get("/auth/oidc/jwks");
    assert.equal(response.status, 200);
    assert.equal(response.body.keys.length, 1);
    assert.equal(response.body.keys[0].kty, "RSA");
    assert.equal(response.body.keys[0].d, undefined);
  });

  it("sends an approved client's authorization request to the interaction page", async () => {
    const client = await createOAuthClient();
    const { response, uid } = await startAuthorization(
      request.agent(API),
      client.id,
      pkce().challenge
    );
    assert.equal(response.status, 303);
    assert.ok(uid, response.headers.location);
    assert.ok(
      await prisma.oAuthPayload.findFirst({
        where: { model: "Interaction", id: uid },
      })
    );
  });

  it("requires PKCE", async () => {
    const client = await createOAuthClient();
    const params = authorizeParams(client.id, "unused");
    params.delete("code_challenge");
    params.delete("code_challenge_method");
    const response = await request(API).get(`/auth/oidc/auth?${params}`);
    assert.equal(response.status, 303);
    const location = new URL(response.headers.location);
    assert.equal(location.origin + location.pathname, REDIRECT_URI);
    assert.equal(location.searchParams.get("error"), "invalid_request");
  });

  it("refuses a redirect_uri the client didn't register", async () => {
    const client = await createOAuthClient();
    const response = await request(API).get(
      `/auth/oidc/auth?${authorizeParams(client.id, pkce().challenge, {
        redirect_uri: "https://evil.example/callback",
      })}`
    );
    assert.equal(response.status, 303);
    assert.equal(
      new URL(response.headers.location).pathname,
      "/auth/oauth/error"
    );
  });

  it("refuses clients that aren't approved, are deleted, or have no redirect URIs", async () => {
    const pending = await createOAuthClient({ status: "pending" });
    const revoked = await createOAuthClient({ status: "revoked" });
    const deleted = await createOAuthClient({ deletedAt: new Date() });
    const noRedirects = await createOAuthClient({ redirectUris: [] });
    const keyless = await createOAuthClient({ key: null });

    for (const client of [pending, revoked, deleted, noRedirects, keyless]) {
      const response = await request(API).get(
        `/auth/oidc/auth?${authorizeParams(client.id, pkce().challenge)}`
      );
      assert.equal(response.status, 303, String(client.id));
      const location = new URL(response.headers.location);
      assert.equal(location.pathname, "/auth/oauth/error");
      assert.equal(location.searchParams.get("error"), "invalid_client");
    }
  });
});
