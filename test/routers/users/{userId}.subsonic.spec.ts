import assert from "node:assert";
import { createHash } from "node:crypto";

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";

import {
  authenticateSubsonic,
  createSubsonicCredential,
} from "../../../src/utils/subsonicCredentials";
import { clearTables, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("users/{userId}/subsonic", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return null before credentials are generated", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });

      const response = await requestApp
        .get(`users/${user.id}/subsonic`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { result: null });
    });

    it("should refuse a different logged in user", async () => {
      const { user } = await createUser({ email: "owner@testcom" });
      const { accessToken } = await createUser({ email: "other@testcom" });

      for (const method of ["get", "post", "delete"] as const) {
        const response = await requestApp[method](`users/${user.id}/subsonic`)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 401, method);
      }
    });
  });

  describe("POST", () => {
    it("should generate credentials and replace them on the next call", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const path = `users/${user.id}/subsonic`;

      const first = await requestApp
        .post(path)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(first.statusCode, 200);
      assert.equal(first.body.result.username, `mirlo-${user.id}`);
      assert.match(first.body.result.password, /^[0-9a-f]{32}$/);
      assert.ok(first.body.result.serverUrl.endsWith("/subsonic"));

      const shown = await requestApp
        .get(path)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(shown.body, first.body);

      const second = await requestApp
        .post(path)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(second.statusCode, 200);
      assert.notEqual(second.body.result.password, first.body.result.password);
    });
  });

  describe("DELETE", () => {
    it("should revoke the credentials", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const path = `users/${user.id}/subsonic`;
      await createSubsonicCredential(user.id);

      const response = await requestApp
        .delete(path)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { message: "success" });

      const shown = await requestApp
        .get(path)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(shown.body, { result: null });

      const again = await requestApp
        .delete(path)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(again.statusCode, 200);
    });
  });

  describe("authenticateSubsonic", () => {
    let userId: number;
    let username: string;
    let password: string;

    const token = (salt: string) =>
      createHash("md5")
        .update(password + salt)
        .digest("hex");

    beforeEach(async () => {
      const { user } = await createUser({ email: "test@testcom" });
      userId = user.id;
      ({ username, password } = await createSubsonicCredential(user.id));
    });

    it("should accept the password as sent", async () => {
      const result = await authenticateSubsonic({ u: username, p: password });

      assert.deepEqual(result, { userId });
    });

    it("should accept the password hex encoded", async () => {
      const result = await authenticateSubsonic({
        u: username,
        p: `enc:${Buffer.from(password).toString("hex")}`,
      });

      assert.deepEqual(result, { userId });
    });

    it("should accept a salted token", async () => {
      const result = await authenticateSubsonic({
        u: username,
        t: token("abc"),
        s: "abc",
      });

      assert.deepEqual(result, { userId });
    });

    it("should reject a wrong token or password with 40", async () => {
      assert.deepEqual(
        await authenticateSubsonic({ u: username, t: token("xyz"), s: "abc" }),
        { error: 40 }
      );
      assert.deepEqual(
        await authenticateSubsonic({ u: username, p: "wrong" }),
        { error: 40 }
      );
    });

    it("should reject an unknown username with 40", async () => {
      const result = await authenticateSubsonic({
        u: "mirlo-999999",
        p: password,
      });

      assert.deepEqual(result, { error: 40 });
    });

    it("should report a missing parameter with 10", async () => {
      assert.deepEqual(await authenticateSubsonic({ p: password }), {
        error: 10,
      });
      assert.deepEqual(
        await authenticateSubsonic({ u: username, t: token("abc") }),
        { error: 10 }
      );
    });

    it("should accept the password as an apiKey", async () => {
      const result = await authenticateSubsonic({ apiKey: password });

      assert.deepEqual(result, { userId });
    });

    it("should reject an apiKey sent with another credential with 43", async () => {
      const result = await authenticateSubsonic({
        apiKey: password,
        u: username,
      });

      assert.deepEqual(result, { error: 43 });
    });

    it("should reject an unknown apiKey with 44", async () => {
      const result = await authenticateSubsonic({ apiKey: "wrong" });

      assert.deepEqual(result, { error: 44 });
    });

    it("should reject a deleted user", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      assert.deepEqual(
        await authenticateSubsonic({ u: username, p: password }),
        { error: 40 }
      );
      assert.deepEqual(await authenticateSubsonic({ apiKey: password }), {
        error: 44,
      });
    });

    it("should reject a disabled user", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { disabledAt: new Date() },
      });

      assert.deepEqual(
        await authenticateSubsonic({ u: username, p: password }),
        { error: 40 }
      );
      assert.deepEqual(await authenticateSubsonic({ apiKey: password }), {
        error: 44,
      });
    });
  });
});
