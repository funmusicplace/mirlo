import assert from "node:assert";
import { generateKeyPairSync, sign } from "node:crypto";

import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createSiteSettings, createUser } from "../../utils";
import { requestApp } from "../utils";

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const verificationKey = publicKey
  .export({ format: "der", type: "spki" })
  .toString("base64");

const postEvents = (
  events: unknown[],
  key = privateKey,
  timestamp = `${Math.floor(Date.now() / 1000)}`
) => {
  const body = JSON.stringify(events);
  const signature = sign("sha256", Buffer.from(timestamp + body), key);
  return requestApp
    .post("webhooks/sendgrid")
    .set("Content-Type", "application/json")
    .set("X-Twilio-Email-Event-Webhook-Signature", signature.toString("base64"))
    .set("X-Twilio-Email-Event-Webhook-Timestamp", timestamp)
    .send(body);
};

describe("webhooks/sendgrid", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    await createSiteSettings({
      emailProvider: {
        provider: "sendgrid",
        sendgrid: { webhookPublicKey: verificationKey },
      },
    });
  });

  it("rejects a request signed with the wrong key", async () => {
    const { user } = await createUser({ email: "bounced@example.com" });
    const { privateKey: otherKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });

    const response = await postEvents(
      [{ event: "bounce", type: "bounce", email: user.email }],
      otherKey
    );

    assert.equal(response.status, 401);
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated?.emailBouncedAt, null);
  });

  it("rejects a stale timestamp", async () => {
    const { user } = await createUser({ email: "bounced@example.com" });

    const response = await postEvents(
      [{ event: "bounce", type: "bounce", email: user.email }],
      privateKey,
      `${Math.floor(Date.now() / 1000) - 60 * 60}`
    );

    assert.equal(response.status, 401);
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated?.emailBouncedAt, null);
  });

  it("records hard bounces and dropped bounced addresses", async () => {
    const { user: bounced } = await createUser({
      email: "bounced@example.com",
    });
    const { user: dropped } = await createUser({
      email: "dropped@example.com",
    });

    const response = await postEvents([
      {
        event: "bounce",
        type: "bounce",
        email: "Bounced@Example.com",
        reason: "550 5.1.1 User unknown",
      },
      { event: "dropped", email: dropped.email, reason: "Bounced Address" },
    ]);

    assert.equal(response.status, 200);
    const updatedBounced = await prisma.user.findUnique({
      where: { id: bounced.id },
    });
    assert.ok(updatedBounced?.emailBouncedAt);
    assert.equal(updatedBounced?.emailBounceReason, "550 5.1.1 User unknown");
    const updatedDropped = await prisma.user.findUnique({
      where: { id: dropped.id },
    });
    assert.equal(updatedDropped?.emailBounceReason, "Bounced Address");
  });

  it("ignores blocked bounces and other events", async () => {
    const { user } = await createUser({ email: "blocked@example.com" });

    const response = await postEvents([
      { event: "bounce", type: "blocked", email: user.email },
      { event: "deferred", email: user.email },
      { event: "dropped", email: user.email, reason: "Spam Content" },
      { event: "dropped", email: user.email, reason: "Unsubscribed Address" },
      { event: "dropped", email: user.email, reason: "Spam Reporting Address" },
    ]);

    assert.equal(response.status, 200);
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated?.emailBouncedAt, null);
  });

  it("keeps the original bounce when later drops arrive", async () => {
    const { user } = await createUser({ email: "bounced@example.com" });

    await postEvents([
      {
        event: "bounce",
        type: "bounce",
        email: user.email,
        reason: "550 5.1.1 User unknown",
      },
    ]);
    const first = await prisma.user.findUnique({ where: { id: user.id } });

    const response = await postEvents([
      { event: "dropped", email: user.email, reason: "Bounced Address" },
    ]);

    assert.equal(response.status, 200);
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated?.emailBounceReason, "550 5.1.1 User unknown");
    assert.equal(
      updated?.emailBouncedAt?.getTime(),
      first?.emailBouncedAt?.getTime()
    );
  });
});
