import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { setUserTrustLevel } from "../../src/utils/trustLevel";
import { clearTables, createUser } from "../utils";

describe("trustLevel", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
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

      const change = await setUserTrustLevel(user.id, 0, "ADMIN", admin.id);

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
