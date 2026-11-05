import assert from "node:assert";

import * as dotenv from "dotenv";

dotenv.config();
import { randomUUID } from "node:crypto";

import { beforeEach, describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import { clearTables } from "../utils";

const requestAuth = request(`${process.env.API_DOMAIN}/auth/`);

describe("auth/verify-email", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("marks users as verified when the confirmation code matches", async () => {
    const email = "verify@example.com";

    const sendResponse = await requestAuth
      .post("verify-email")
      .send({ email })
      .set("Accept", "application/json");

    assert.equal(sendResponse.status, 200);

    const verification = await prisma.emailVerification.findFirstOrThrow({
      where: { email },
    });

    const verifyResponse = await requestAuth
      .post("verify-email")
      .send({ email, code: verification.token })
      .set("Accept", "application/json");

    assert.equal(verifyResponse.status, 200);
    assert(verifyResponse.body.userId);

    const user = await prisma.user.findFirstOrThrow({
      where: { email },
      omit: { emailConfirmationToken: false },
    });

    assert.equal(user.emailConfirmationToken, null);
    assert.equal(user.emailConfirmationExpiration, null);
  });

  it("stops accepting codes after repeated wrong guesses", async () => {
    const email = `guess-${randomUUID()}@example.com`;
    await requestAuth.post("verify-email").send({ email });
    const verification = await prisma.emailVerification.findFirstOrThrow({
      where: { email },
    });
    const wrong = verification.token === "000000" ? "000001" : "000000";

    for (let i = 0; i < 5; i++) {
      const response = await requestAuth
        .post("verify-email")
        .send({ email, code: wrong });
      assert.equal(response.status, 400);
    }

    const blocked = await requestAuth
      .post("verify-email")
      .send({ email, code: verification.token });
    assert.equal(blocked.status, 429);

    const otherEmail = await requestAuth
      .post("verify-email")
      .send({ email: `other-${randomUUID()}@example.com`, code: wrong });
    assert.equal(otherEmail.status, 400);
  });
});
