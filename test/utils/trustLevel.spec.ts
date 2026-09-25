import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  applyTrustSignal,
  setUserTrustLevel,
} from "../../src/utils/trustLevel";
import { clearTables, createUser } from "../utils";

describe("trustLevel", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("applyTrustSignal", () => {
    it("promotes a new user and records the change", async () => {
      const { user } = await createUser({ email: "user@test.com" });

      const change = await applyTrustSignal(
        user.id,
        "PAYMENT_ACCOUNT_VERIFIED"
      );

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
      });
      assert.equal(updated?.trustLevel, 1);
      assert.equal(change?.fromLevel, 0);
      assert.equal(change?.toLevel, 1);
      assert.equal(change?.reason, "PAYMENT_ACCOUNT_VERIFIED");
      assert.equal(change?.changedByUserId, null);
    });

    it("does nothing when the signal is received again", async () => {
      const { user } = await createUser({ email: "user@test.com" });

      await applyTrustSignal(user.id, "PAYMENT_ACCOUNT_VERIFIED");
      const second = await applyTrustSignal(
        user.id,
        "PAYMENT_ACCOUNT_VERIFIED"
      );

      const changes = await prisma.userTrustLevelChange.findMany({
        where: { userId: user.id },
      });
      assert.equal(second, null);
      assert.equal(changes.length, 1);
    });

    it("never lowers a user who is already above the target level", async () => {
      const { user } = await createUser({
        email: "user@test.com",
        trustLevel: 3,
      });

      const change = await applyTrustSignal(
        user.id,
        "PAYMENT_ACCOUNT_VERIFIED"
      );

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
      });
      assert.equal(change, null);
      assert.equal(updated?.trustLevel, 3);
    });
  });

  describe("setUserTrustLevel", () => {
    it("records who made a manual change", async () => {
      const { user: admin } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const { user } = await createUser({
        email: "user@test.com",
        trustLevel: 2,
      });

      const change = await setUserTrustLevel(user.id, 0, "ADMIN", {
        changedByUserId: admin.id,
      });

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
      });
      assert.equal(updated?.trustLevel, 0);
      assert.equal(change?.fromLevel, 2);
      assert.equal(change?.toLevel, 0);
      assert.equal(change?.reason, "ADMIN");
      assert.equal(change?.changedByUserId, admin.id);
    });

    it("does nothing when the level is unchanged", async () => {
      const { user } = await createUser({
        email: "user@test.com",
        trustLevel: 1,
      });

      const change = await setUserTrustLevel(user.id, 1, "ADMIN");

      const changes = await prisma.userTrustLevelChange.findMany({
        where: { userId: user.id },
      });
      assert.equal(change, null);
      assert.equal(changes.length, 0);
    });
  });
});
