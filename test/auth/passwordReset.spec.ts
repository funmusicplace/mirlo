import assert from "assert";

import prisma from "@mirlo/prisma";
import request from "supertest";

import { clearTables, createUser } from "../utils";

const authRequestApp = request(`${process.env.API_DOMAIN}/auth/`);

describe("auth/password-reset/set-password", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should not set a password without the reset token", async () => {
    const { user } = await createUser({
      email: "test@test.com",
      password: "original-password",
      emailConfirmationToken: null,
    });

    for (const body of [
      { id: user.id, password: "attacker-password" },
      { id: user.id, token: { not: "x" }, password: "attacker-password" },
    ]) {
      const response = await authRequestApp
        .post("password-reset/set-password")
        .send(body)
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      assert.equal(response.header["set-cookie"], undefined);
    }

    const login = await authRequestApp
      .post("login")
      .send({ email: user.email, password: "original-password" });
    assert.equal(login.status, 200);
  });

  it("should set a password with the reset token", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetConfirmationToken: "reset-token",
        passwordResetConfirmationExpiration: new Date(Date.now() + 60_000),
      },
    });

    const wrong = await authRequestApp
      .post("password-reset/set-password")
      .send({ id: user.id, token: "wrong-token", password: "a-new-password" });
    assert.equal(wrong.status, 404);

    const response = await authRequestApp
      .post("password-reset/set-password")
      .send({ id: user.id, token: "reset-token", password: "a-new-password" });
    assert.equal(response.status, 200);
  });
});
