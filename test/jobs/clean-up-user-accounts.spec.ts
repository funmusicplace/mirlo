import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";
import assert from "node:assert";
import cleanUpUserAccounts from "../../src/jobs/clean-up-user-accounts";
import prisma from "../../prisma/prisma";

describe("clean-up-user-accounts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should run with no user accounts found", async () => {
    await cleanUpUserAccounts();
  });

  it("should scramble a user account more than 6 months old", async () => {
    const today = new Date();
    const sevenMonthsAgo = today.setMonth(today.getMonth() - 7);

    const { user } = await createUser({
      email: "test@test.com",
      deletedAt: new Date(sevenMonthsAgo),
    });

    await cleanUpUserAccounts();

    const refreshedUser = await prisma.user.findFirst({
      where: { id: user.id, deletedAt: { not: null } },
    });

    assert.equal(refreshedUser?.name, "deletedUser");
    assert.notEqual(refreshedUser?.email, user.email);
  });
});
