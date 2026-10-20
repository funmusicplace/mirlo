import assert from "assert";

import prisma from "@mirlo/prisma";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import express, { Request } from "express";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import request from "supertest";
dotenv.config();

import { resolveBearer } from "../../../src/auth/oauth";
import { oidcHandler } from "../../../src/auth/oidc/provider";
import oauth from "../../../src/routers/oauth";
import errorHandler from "../../../src/utils/error";
import { clearTables, createUser } from "../../utils";

import {
  REDIRECT_URI,
  pathOf,
  pkce,
  signIn,
  startAuthorization,
} from "./utils";

const app = express();
app.use("/oidc", oidcHandler);
app.use(cookieParser());
app.use(express.json());
app.use("/oauth", oauth);
app.use(errorHandler);

const CLIENT_ID = "https://radiccio.app/oauth/client.json";

const document = {
  client_id: CLIENT_ID,
  client_name: "Radiccio",
  client_uri: "https://radiccio.app",
  redirect_uris: [REDIRECT_URI],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
};

describe("oauth client ID metadata documents", () => {
  let accessToken: string;
  let userId: number;

  beforeEach(async () => {
    await clearTables();
    const created = await createUser({
      email: "fan@example.com",
      emailConfirmationToken: null,
    });
    accessToken = created.accessToken;
    userId = created.user.id;

    const realFetch = globalThis.fetch;
    sinon.stub(globalThis, "fetch").callsFake(async (input, init) =>
      String(input) === CLIENT_ID
        ? new Response(JSON.stringify(document), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        : realFetch(input, init)
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  const loggedInAgent = () => {
    const agent = request.agent(app);
    signIn(agent, accessToken, "127.0.0.1");
    return agent;
  };

  const tokenRequest = (code: string, verifier: string) =>
    request(app).post("/oidc/token").type("form").send({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });

  it("shows an unknown app the not-approved page and never allows it", async () => {
    const agent = loggedInAgent();
    const { uid } = await startAuthorization(
      agent,
      CLIENT_ID,
      pkce().challenge
    );
    assert.ok(uid);

    const details = await agent.get(`/oauth/${uid}/details`);
    assert.equal(details.status, 200, details.text);
    assert.equal(details.body.result.approval, "unknown");
    assert.equal(details.body.result.client.name, "Radiccio");
    assert.equal(details.body.result.client.domain, "radiccio.app");

    const allow = await agent
      .post(`/oauth/${uid}/decision`)
      .send({ action: "allow" });
    assert.equal(allow.status, 403);

    const token = await tokenRequest("made-up", pkce().verifier);
    assert.equal(token.body.error, "invalid_client");
  });

  it("sends the visitor back to an unapproved app with access_denied", async () => {
    const agent = request.agent(app);
    const { uid } = await startAuthorization(
      agent,
      CLIENT_ID,
      pkce().challenge
    );

    const back = await agent
      .post(`/oauth/${uid}/decision`)
      .send({ action: "deny" });
    const resume = await agent.get(pathOf(back.body.result.redirectTo));
    const callback = new URL(resume.headers.location);
    assert.equal(callback.origin + callback.pathname, REDIRECT_URI);
    assert.equal(callback.searchParams.get("error"), "access_denied");
  });

  it("lets only a logged-in user request approval, once", async () => {
    const anonymous = request.agent(app);
    const first = await startAuthorization(
      anonymous,
      CLIENT_ID,
      pkce().challenge
    );
    const refused = await anonymous
      .post(`/oauth/${first.uid}/decision`)
      .send({ action: "requestApproval" });
    assert.equal(refused.status, 401);
    assert.equal(await prisma.client.count(), 0);

    const agent = loggedInAgent();
    for (let i = 0; i < 2; i++) {
      const { uid } = await startAuthorization(
        agent,
        CLIENT_ID,
        pkce().challenge
      );
      const requested = await agent
        .post(`/oauth/${uid}/decision`)
        .send({ action: "requestApproval" });
      assert.equal(requested.status, 200, requested.text);
      assert.equal(requested.body.result.approval, "pending");
    }

    const rows = await prisma.client.findMany();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].clientIdUrl, CLIENT_ID);
    assert.equal(rows[0].status, "pending");
    assert.equal(rows[0].applicationName, "Radiccio");
    assert.equal(rows[0].userId, userId);
    assert.deepEqual(rows[0].redirectUris, [REDIRECT_URI]);
    assert.equal(rows[0].key, null);
  });

  const createRow = (data: {
    status: "pending" | "revoked";
    deletedAt: Date;
  }) =>
    prisma.client.create({
      data: {
        applicationName: "Radiccio",
        applicationUrl: "https://radiccio.app",
        allowedCorsOrigins: [],
        clientIdUrl: CLIENT_ID,
        ...data,
      },
    });

  it("keeps a revoked app blocked after an admin deletes it", async () => {
    await createRow({ status: "revoked", deletedAt: new Date() });
    const agent = loggedInAgent();
    const { location } = await startAuthorization(
      agent,
      CLIENT_ID,
      pkce().challenge
    );
    assert.equal(new URL(location).pathname, "/oauth/error");
  });

  it("lets a deleted app that wasn't revoked be requested again", async () => {
    const row = await createRow({ status: "pending", deletedAt: new Date() });
    const agent = loggedInAgent();
    const { uid } = await startAuthorization(
      agent,
      CLIENT_ID,
      pkce().challenge
    );
    const details = await agent.get(`/oauth/${uid}/details`);
    assert.equal(details.body.result.approval, "unknown");

    const requested = await agent
      .post(`/oauth/${uid}/decision`)
      .send({ action: "requestApproval" });
    assert.equal(requested.status, 200, requested.text);

    const restored = await prisma.client.findFirstOrThrow({
      where: { id: row.id },
    });
    assert.equal(restored.status, "pending");
    assert.equal(restored.deletedAt, null);
    assert.equal(restored.userId, userId);
  });

  it("issues tokens once approved, and stops when revoked", async () => {
    const row = await prisma.client.create({
      data: {
        applicationName: "Radiccio",
        applicationUrl: "https://radiccio.app",
        allowedCorsOrigins: [],
        clientIdUrl: CLIENT_ID,
        status: "approved",
      },
    });
    const agent = loggedInAgent();
    const { verifier, challenge } = pkce();
    const { uid } = await startAuthorization(agent, CLIENT_ID, challenge, {
      scope: "openid api",
    });
    const decision = await agent
      .post(`/oauth/${uid}/decision`)
      .send({ action: "allow" });
    assert.equal(decision.status, 200, decision.text);
    const resume = await agent.get(pathOf(decision.body.result.redirectTo));
    const code = new URL(resume.headers.location).searchParams.get("code");
    assert.ok(code, resume.headers.location);

    const token = await tokenRequest(code, verifier);
    assert.equal(token.status, 200, token.text);

    const bearerRequest = () =>
      ({
        headers: { authorization: `Bearer ${token.body.access_token}` },
      }) as Request;
    const valid = await resolveBearer(bearerRequest());
    assert.equal(valid.status, "valid");
    assert.equal(valid.status === "valid" && valid.client.id, row.id);

    await prisma.client.update({
      where: { id: row.id },
      data: { status: "revoked" },
    });
    assert.equal((await resolveBearer(bearerRequest())).status, "invalid");

    const again = await startAuthorization(
      request.agent(app),
      CLIENT_ID,
      pkce().challenge
    );
    assert.equal(new URL(again.location).pathname, "/oauth/error");
  });
});
