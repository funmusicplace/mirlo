import assert from "assert";

import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import pug from "pug";
import sinon from "sinon";
import request from "supertest";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { passwordResetInitiate } from "../../src/routers/auth/passwordReset";
import { buildTokens } from "../../src/routers/auth/utils";
import { getClient } from "../../src/utils/getClient";
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

  it("should log out other sessions", async () => {
    const { user, accessToken } = await createUser({ email: "test@test.com" });
    const { refreshToken } = buildTokens(user);
    const legacyToken = jwt.sign(
      { email: user.email, id: user.id },
      process.env.JWT_SECRET ?? ""
    );
    for (const token of [accessToken, legacyToken]) {
      const before = await authRequestApp
        .get("profile")
        .set("Cookie", [`jwt=${token}`]);
      assert.equal(before.status, 200);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetConfirmationToken: "reset-token",
        passwordResetConfirmationExpiration: new Date(Date.now() + 60_000),
      },
    });
    const reset = await authRequestApp
      .post("password-reset/set-password")
      .send({ id: user.id, token: "reset-token", password: "a-new-password" });
    assert.equal(reset.status, 200);

    for (const token of [accessToken, legacyToken]) {
      const old = await authRequestApp
        .get("profile")
        .set("Cookie", [`jwt=${token}`]);
      assert.equal(old.status, 401);
    }

    const oldRefresh = await authRequestApp
      .post("refresh")
      .set("Cookie", [`refresh=${refreshToken}`]);
    assert.equal(oldRefresh.status, 401);

    const current = await authRequestApp
      .get("profile")
      .set("Cookie", reset.header["set-cookie"]);
    assert.equal(current.status, 200);
  });
});

describe("auth/password-reset/initiate", () => {
  beforeEach(async () => {
    await clearTables();
  });

  afterEach(() => {
    sinon.restore();
  });

  const initiate = async (email: string, redirectClient: string) => {
    const add = sinon.stub(sendMailQueue, "add").resolves();
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
      json: sinon.stub(),
    };
    await passwordResetInitiate(
      { body: { email, redirectClient } } as Request,
      res as unknown as Response,
      () => {}
    );
    return add.firstCall.args[1].locals;
  };

  it("should keep a redirect on the client's origin", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const { applicationUrl } = await getClient();
    const redirectClient = `${new URL(applicationUrl).origin}/password-reset`;

    const locals = await initiate(user.email, redirectClient);
    assert.equal(locals.redirectClient, redirectClient);
  });

  it("should not put a foreign redirect into the email", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const { applicationUrl } = await getClient();
    const crafted = `"><a href="https://evil.example">Unlock</a><a x="`;

    for (const redirectClient of [crafted, "https://evil.example/reset"]) {
      const locals = await initiate(user.email, redirectClient);
      assert.equal(
        locals.redirectClient,
        new URL("/password-reset", applicationUrl).toString()
      );
      sinon.restore();
    }

    const html = pug.renderFile("emails/password-reset/html.pug", {
      t: (key: string) => key,
      user,
      host: "http://api",
      token: "tok",
      redirectClient: crafted,
    });
    assert(!html.includes('href="https://evil.example"'));
  });
});
