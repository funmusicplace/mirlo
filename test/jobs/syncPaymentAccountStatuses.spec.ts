import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import syncPaymentAccountStatuses from "../../src/jobs/tasks/sync-payment-account-statuses";
import { StripePaymentProcessor } from "../../src/utils/payments/stripeProcessor";
import * as stripeUtils from "../../src/utils/stripe";
import { clearTables, createUser } from "../utils";

const stubAccountList = (accounts: Partial<Stripe.Account>[]) =>
  sinon.stub(stripeUtils.stripe.accounts, "list").returns({
    async *[Symbol.asyncIterator]() {
      for (const account of accounts) {
        yield account as Stripe.Account;
      }
    },
  } as unknown as ReturnType<typeof stripeUtils.stripe.accounts.list>);

describe("syncPaymentAccountStatuses", () => {
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

  it("refreshes the flag for every matched account and promotes the verified ones", async () => {
    const { user: verified } = await createUser({
      email: "verified@test.com",
      stripeAccountId: "acct_verified",
    });
    const { user: pending } = await createUser({
      email: "pending@test.com",
      stripeAccountId: "acct_pending",
    });
    const { user: disabled } = await createUser({
      email: "disabled@test.com",
      stripeAccountId: "acct_disabled",
      canReceivePayments: true,
      trustLevel: 1,
    });
    const { user: unknownToStripe } = await createUser({
      email: "unknown@test.com",
      stripeAccountId: "acct_unknown",
    });
    stubAccountList([
      { id: "acct_verified", charges_enabled: true },
      { id: "acct_pending", charges_enabled: false },
      { id: "acct_disabled", charges_enabled: false },
      { id: "acct_not_a_mirlo_user", charges_enabled: true },
    ]);

    const summary = await syncPaymentAccountStatuses();

    assert.deepEqual(summary, { users: 4, matched: 3, updated: 2 });

    const byId = new Map(
      (
        await prisma.user.findMany({
          select: { id: true, trustLevel: true, canReceivePayments: true },
        })
      ).map((u) => [u.id, u])
    );
    assert.deepEqual(byId.get(verified.id), {
      id: verified.id,
      trustLevel: 1,
      canReceivePayments: true,
    });
    assert.deepEqual(byId.get(pending.id), {
      id: pending.id,
      trustLevel: 0,
      canReceivePayments: false,
    });
    assert.deepEqual(byId.get(disabled.id), {
      id: disabled.id,
      trustLevel: 1,
      canReceivePayments: false,
    });
    assert.deepEqual(byId.get(unknownToStripe.id), {
      id: unknownToStripe.id,
      trustLevel: 0,
      canReceivePayments: false,
    });
  });

  it("reports the failure in the summary when the processor call fails", async () => {
    const { user } = await createUser({
      email: "verified@test.com",
      stripeAccountId: "acct_verified",
    });
    sinon
      .stub(stripeUtils.stripe.accounts, "list")
      .throws(new Error("No API key provided"));

    const summary = await syncPaymentAccountStatuses();

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(summary.users, 1);
    assert.equal(summary.matched, 0);
    assert.ok(summary.error?.includes("No API key provided"));
    assert.equal(updated?.trustLevel, 0);
  });

  it("refreshes the processor before listing accounts", async () => {
    const refresh = sinon
      .stub(StripePaymentProcessor.prototype, "refresh")
      .resolves();
    stubAccountList([]);

    await syncPaymentAccountStatuses();

    assert.equal(refresh.calledOnce, true);
  });

  it("writes nothing when everything is already in sync", async () => {
    const { user } = await createUser({
      email: "verified@test.com",
      stripeAccountId: "acct_verified",
      canReceivePayments: true,
      trustLevel: 1,
    });
    stubAccountList([{ id: "acct_verified", charges_enabled: true }]);

    const summary = await syncPaymentAccountStatuses();

    const changes = await prisma.userTrustLevelChange.findMany({
      where: { userId: user.id },
    });
    assert.deepEqual(summary, { users: 1, matched: 1, updated: 0 });
    assert.equal(changes.length, 0);
  });
});
