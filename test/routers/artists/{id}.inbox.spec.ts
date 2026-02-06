import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach, afterEach } from "mocha";
import { clearTables, createArtist, createUser } from "../../utils";
import prisma from "@mirlo/prisma";
import crypto from "crypto";

import { requestApp } from "../utils";

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

describe("artists/{id}/inbox", () => {
  let testPublicKey: string;
  let testPrivateKey: string;

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
  });

  describe("POST", () => {
    it("should reject requests without signature", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Follow",
        })
        .set("content-type", "application/activity+json");

      assert.equal(response.statusCode, 401);
      assert(response.body.error?.includes("Missing HTTP signature"));
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

      // Add dummy signature header to pass signature check
      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Follow",
        })
        .set("content-type", "application/json")
        .set(
          "signature",
          'keyId="test",headers="(request-target) host date digest",signature="test"'
        );

      assert.equal(response.statusCode, 400);
      assert(response.body.error?.includes("Only accepts ActivityPub headers"));
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

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
        })
        .set("content-type", "application/activity+json")
        .set(
          "signature",
          'keyId="test",headers="(request-target) host date digest",signature="test"'
        );

      console.log("response", response.body);
      assert.equal(response.statusCode, 400);
      assert(response.body.error?.includes("Not a valid Activity"));
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

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Create",
        })
        .set("content-type", "application/activity+json")
        .set(
          "signature",
          'keyId="test",headers="(request-target) host date digest",signature="test"'
        );

      assert.equal(response.statusCode, 501);
      assert(response.body.error?.includes("not implemented"));
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

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Follow",
          object: actorUrl,
        })
        .set("content-type", "application/activity+json")
        .set("signature", sigInfo.signature)
        .set("digest", sigInfo.digest)
        .set("date", sigInfo.date)
        .set("host", "localhost");

      assert.equal(response.statusCode, 200);

      const result = await prisma.activityPubArtistFollowers.findFirst({
        where: {
          artistId: artist.id,
        },
      });

      assert(result, "Follower should be created");
      assert.equal(result?.actor, "https://test-actor.com/remote-actor");
    });
  });
});
