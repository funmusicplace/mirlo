import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach, afterEach } from "mocha";
import { clearTables, createArtist, createUser } from "../../utils";
import prisma from "@mirlo/prisma";
import crypto from "crypto";
import sinon from "sinon";
import { Request, Response } from "express";

import inboxPOST from "../../../src/activityPub/inboxPOST";
import * as utilsModule from "../../../src/activityPub/utils";

function generateHttpSignature(
  method: string,
  path: string,
  body: string,
  host: string,
  privKey: string
): { signature: string; digest: string; date: string } {
  const digestHash = crypto.createHash("sha256").update(body).digest("base64");
  const date = new Date().toUTCString();

  const signString = `(request-target): ${method.toLowerCase()} ${path}\nhost: ${host}\ndate: ${date}\ndigest: SHA-256=${digestHash}`;

  const signer = crypto.createSign("sha256");
  signer.update(signString);
  signer.end();
  const signatureBuffer = signer.sign(privKey);
  const signatureB64 = signatureBuffer.toString("base64");

  const header = `keyId="https://test-actor.com/remote-actor#main-key",headers="(request-target) host date digest",signature="${signatureB64}"`;

  return {
    signature: header,
    digest: `SHA-256=${digestHash}`,
    date,
  };
}

describe("inboxPOST", () => {
  let testPublicKey: string;
  let testPrivateKey: string;
  let fetchStub: sinon.SinonStub;
  let nextStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }

    // Generate a test RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    testPublicKey = publicKey;
    testPrivateKey = privateKey;

    // Stub fetch globally for fetchRemotePublicKey
    fetchStub = sinon.stub(global, "fetch" as any);
    nextStub = sinon.stub();
  });

  afterEach(() => {
    if (fetchStub) {
      fetchStub.restore();
    }
    sinon.restore();
  });

  it("should reject requests without signature", async () => {
    const { user: artistUser } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist",
      userId: artistUser.id,
      enabled: true,
    });

    const req = {
      params: { id: artist.urlSlug },
      headers: {
        "content-type": "application/activity+json",
      },
      body: {
        actor: "https://test-actor.com/remote-actor",
        type: "Follow",
      },
    } as any as Request;

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      set: sinon.stub().returnsThis(),
    } as any as Response;

    await inboxPOST(req, res, nextStub);

    assert(nextStub.calledOnce);
    const error = nextStub.getCall(0).args[0];
    assert(error.description.includes("Missing HTTP signature"));
  });

  it("should reject requests with wrong content-type", async () => {
    const { user: artistUser } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist",
      userId: artistUser.id,
      enabled: true,
    });

    const req = {
      params: { id: artist.urlSlug },
      headers: {
        "content-type": "application/json",
        signature:
          'keyId="test",headers="(request-target) host date digest",signature="test"',
      },
      body: {
        actor: "https://test-actor.com/remote-actor",
        type: "Follow",
      },
    } as any as Request;

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      set: sinon.stub().returnsThis(),
    } as any as Response;

    await inboxPOST(req, res, nextStub);

    assert(nextStub.calledOnce);
    const error = nextStub.getCall(0).args[0];
    assert(error.description.includes("Only accepts ActivityPub headers"));
  });

  it("should reject Activities without actor or type", async () => {
    const { user: artistUser } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist",
      userId: artistUser.id,
      enabled: true,
    });

    const body = JSON.stringify({
      actor: "https://test-actor.com/remote-actor",
    });

    const sigInfo = generateHttpSignature(
      "POST",
      `/v1/artists/${artist.urlSlug}/inbox`,
      body,
      "localhost",
      testPrivateKey
    );

    // Mock fetchRemotePublicKey to return our test public key
    sinon.stub(utilsModule, "fetchRemotePublicKey").resolves(testPublicKey);

    const req = {
      params: { id: artist.urlSlug },
      method: "POST",
      path: `/v1/artists/${artist.urlSlug}/inbox`,
      headers: {
        "content-type": "application/activity+json",
        signature: sigInfo.signature,
        digest: sigInfo.digest,
        date: sigInfo.date,
        host: "localhost",
      },
      body: {
        actor: "https://test-actor.com/remote-actor",
      },
      rawBody: body,
    } as any as Request;

    const res = {
      status: sinon.stub().returnsThis() as any,
      json: sinon.stub().returnsThis() as any,
      set: sinon.stub().returnsThis() as any,
    } as any as Response;

    await inboxPOST(req, res, nextStub);

    assert(nextStub.calledOnce);
    const error = nextStub.getCall(0).args[0];
    assert(error.description.includes("Not a valid Activity"));
  });

  it("should reject unimplemented activity types", async () => {
    const { user: artistUser } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist",
      userId: artistUser.id,
      enabled: true,
    });

    const body = JSON.stringify({
      actor: "https://test-actor.com/remote-actor",
      type: "Create",
    });

    const sigInfo = generateHttpSignature(
      "POST",
      `/v1/artists/${artist.urlSlug}/inbox`,
      body,
      "localhost",
      testPrivateKey
    );

    sinon.stub(utilsModule, "fetchRemotePublicKey").resolves(testPublicKey);

    const req = {
      params: { id: artist.urlSlug },
      method: "POST",
      path: `/v1/artists/${artist.urlSlug}/inbox`,
      headers: {
        "content-type": "application/activity+json",
        signature: sigInfo.signature,
        digest: sigInfo.digest,
        date: sigInfo.date,
        host: "localhost",
      },
      body: {
        actor: "https://test-actor.com/remote-actor",
        type: "Create",
      },
      rawBody: body,
    } as any as Request;

    const res = {
      status: sinon.stub().returnsThis() as any,
      json: sinon.stub().returnsThis() as any,
      set: sinon.stub().returnsThis() as any,
    } as any as Response;

    await inboxPOST(req, res, nextStub);

    assert(nextStub.calledOnce);
    const error = nextStub.getCall(0).args[0];
    assert(error.description.includes("not implemented"));
  });

  it("should accept a valid Follow activity with correct signature", async () => {
    const { user: artistUser } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist",
      userId: artistUser.id,
      enabled: true,
    });

    const actorUrl = `https://localhost/v1/artists/${artist.urlSlug}`;
    const body = JSON.stringify({
      actor: "https://test-actor.com/remote-actor",
      type: "Follow",
      object: actorUrl,
    });

    const sigInfo = generateHttpSignature(
      "POST",
      `/v1/artists/${artist.urlSlug}/inbox`,
      body,
      "localhost",
      testPrivateKey
    );

    // Mock fetchRemotePublicKey to return our test public key
    sinon.stub(utilsModule, "fetchRemotePublicKey").resolves(testPublicKey);

    // Mock fetch for sending Accept message
    fetchStub.resolves({
      ok: true,
      text: async () => "",
    });

    const req = {
      params: { id: artist.urlSlug },
      method: "POST",
      path: `/v1/artists/${artist.urlSlug}/inbox`,
      headers: {
        "content-type": "application/activity+json",
        signature: sigInfo.signature,
        digest: sigInfo.digest,
        date: sigInfo.date,
        host: "localhost",
        accept: "application/activity+json",
      },
      body: {
        actor: "https://test-actor.com/remote-actor",
        type: "Follow",
        object: actorUrl,
      },
      rawBody: body,
    } as any as Request;

    const res = {
      status: sinon.stub().returnsThis() as any,
      json: sinon.stub().returnsThis() as any,
      set: sinon.stub().returnsThis() as any,
    } as any as Response;

    await inboxPOST(req, res, nextStub);

    // Should call res.status(200) and res.json()
    assert((res.status as any).called);
    assert((res.json as any).called);

    // Verify follower was created
    const follower = await prisma.activityPubArtistFollowers.findFirst({
      where: {
        artistId: artist.id,
      },
    });

    assert(follower);
    assert.equal(follower.actor, "https://test-actor.com/remote-actor");

    // Verify Accept message was sent (fetch called)
    assert(fetchStub.called);
  });
});
