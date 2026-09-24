import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { recordPaymentAccountStatus } from "../../src/utils/paymentAccountStatus";
import { clearTables, createUser } from "../utils";

describe("recordPaymentAccountStatus", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("stores the flag and promotes the user when payments become possible", async () => {
    const { user } = await createUser({ email: "artist@test.com" });

    const changed = await recordPaymentAccountStatus(user.id, true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    const changes = await prisma.userTrustLevelChange.findMany({
      where: { userId: user.id },
    });
    assert.equal(changed, true);
    assert.equal(updated?.canReceivePayments, true);
    assert.equal(updated?.trustLevel, 1);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].reason, "PAYMENT_ACCOUNT_VERIFIED");
  });

  it("does nothing when the flag is already up to date", async () => {
    const { user } = await createUser({
      email: "artist@test.com",
      canReceivePayments: true,
    });

    const changed = await recordPaymentAccountStatus(user.id, true);

    const changes = await prisma.userTrustLevelChange.findMany({
      where: { userId: user.id },
    });
    assert.equal(changed, false);
    assert.equal(changes.length, 0);
  });

  it("clears the flag without touching the trust level when payments get disabled", async () => {
    const { user } = await createUser({
      email: "artist@test.com",
      canReceivePayments: true,
      trustLevel: 1,
    });

    const changed = await recordPaymentAccountStatus(user.id, false);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    const changes = await prisma.userTrustLevelChange.findMany({
      where: { userId: user.id },
    });
    assert.equal(changed, true);
    assert.equal(updated?.canReceivePayments, false);
    assert.equal(updated?.trustLevel, 1);
    assert.equal(changes.length, 0);
  });
});
