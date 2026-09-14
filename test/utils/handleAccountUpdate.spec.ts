import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import * as stripeUtils from "../../src/utils/stripe";
import { clearTables, createUser } from "../utils";

const stubAccount = (account: Partial<Stripe.Account>) =>
  sinon
    .stub(stripeUtils.stripe.accounts, "retrieve")
    .resolves(account as Stripe.Response<Stripe.Account>);

describe("handleAccountUpdate", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  it("promotes the user to verified when Stripe enables charges", async () => {
    const { user } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_verified",
    });
    stubAccount({ id: "acct_verified", charges_enabled: true });

    await stripeUtils.handleAccountUpdate({
      id: "acct_verified",
    } as Stripe.Account);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    const changes = await prisma.userTrustLevelChange.findMany({
      where: { userId: user.id },
    });
    assert.equal(updated?.trustLevel, 1);
    assert.equal(updated?.canReceivePayments, true);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].reason, "PAYMENT_ACCOUNT_VERIFIED");
  });

  it("leaves the user untouched while charges are not enabled", async () => {
    const { user } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_pending",
    });
    stubAccount({ id: "acct_pending", charges_enabled: false });

    await stripeUtils.handleAccountUpdate({
      id: "acct_pending",
    } as Stripe.Account);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    const changes = await prisma.userTrustLevelChange.findMany({
      where: { userId: user.id },
    });
    assert.equal(updated?.trustLevel, 0);
    assert.equal(updated?.canReceivePayments, false);
    assert.equal(changes.length, 0);
  });
});
