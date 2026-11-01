import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import * as sendMailQueueModule from "../../../../src/queues/send-mail-queue";
import { AppError } from "../../../../src/utils/error";
import { chargeFundraiserPledges } from "../../../../src/utils/fundraiser";
import * as stripeUtils from "../../../../src/utils/stripe";
import {
  clearTables,
  createArtist,
  createFundraiser,
  createFundraiserPledge,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/fundraisers/{fundraiserId}/chargePledges", () => {
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

  const stubStripeForCharge = () => {
    sinon.stub(stripeUtils.stripe.accounts, "retrieve").resolves({
      default_currency: "usd",
      country: "US",
    } as unknown as Stripe.Response<Stripe.Account>);
    sinon.stub(stripeUtils.stripe.customers, "list").resolves({
      data: [{ id: "cus_backer" }],
    } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
    sinon.stub(stripeUtils.stripe.paymentMethods, "list").resolves({
      data: [{ id: "pm_backer" }],
    } as unknown as Stripe.Response<Stripe.ApiList<Stripe.PaymentMethod>>);
    sinon.stub(sendMailQueueModule.sendMailQueue, "add").resolves({} as any);
    return sinon.stub(stripeUtils.stripe.paymentIntents, "create").resolves({
      id: "pi_pledge_charge",
      status: "succeeded",
    } as unknown as Stripe.Response<Stripe.PaymentIntent>);
  };

  it("charges pledges on a fundraiser without a release", async () => {
    const { user } = await createUser({
      email: "fundraiser-owner@example.com",
      stripeAccountId: "acct_owner",
    });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id);
    const fundraiser = await createFundraiser(artist.id, {
      name: "Standalone",
      goalAmount: 1000,
    });
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 5000 });
    const createStub = stubStripeForCharge();

    await chargeFundraiserPledges(fundraiser.id);

    assert.equal(createStub.callCount, 1);
    assert.equal(createStub.firstCall.args[0].amount, 5000);
    assert.deepEqual(createStub.firstCall.args[1], {
      stripeAccount: "acct_owner",
    });
  });

  it("charges pledges on the profile's payee account, where they were saved", async () => {
    const { user } = await createUser({
      email: "fundraiser-owner@example.com",
      stripeAccountId: "acct_owner",
    });
    const { user: payee } = await createUser({
      email: "payee@example.com",
      stripeAccountId: "acct_payee",
    });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id, { paymentToUserId: payee.id });
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.profileId, {
      trackGroupId: trackGroup.id,
      goalAmount: 1000,
    });
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 5000 });
    const createStub = stubStripeForCharge();

    await chargeFundraiserPledges(fundraiser.id);

    assert.deepEqual(createStub.firstCall.args[1], {
      stripeAccount: "acct_payee",
    });
  });

  it("marks the fundraiser SUCCESSFUL even when there are no pledges to charge (#1681)", async () => {
    const { user, accessToken } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.profileId, {
      trackGroupId: trackGroup.id,
      isAllOrNothing: false,
    });

    assert.equal(fundraiser.status, "ACTIVE");

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "SUCCESSFUL");
  });

  it("refuses to charge an all-or-nothing fundraiser below its goal", async () => {
    const { user, accessToken } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.profileId, {
      trackGroupId: trackGroup.id,
      isAllOrNothing: true,
      goalAmount: 50000,
    });
    const pledge = await createFundraiserPledge(fundraiser.id, backer.id, {
      amount: 5000,
    });

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "ACTIVE");
    const refreshedPledge = await prisma.fundraiserPledge.findUnique({
      where: { id: pledge.id },
    });
    assert.equal(refreshedPledge?.paidAt, null);
  });

  it("refuses to charge a fundraiser that is no longer active", async () => {
    const { user, accessToken } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.profileId, {
      trackGroupId: trackGroup.id,
      status: "SUCCESSFUL",
    });

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("rejects requests from other artists", async () => {
    const { user: owner } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const { accessToken: otherToken } = await createUser({
      email: "other@example.com",
    });
    const artist = await createArtist(owner.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.profileId, {
      trackGroupId: trackGroup.id,
    });

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${otherToken}`])
      .set("Accept", "application/json");

    assert.notEqual(response.statusCode, 200);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "ACTIVE");
  });

  it("charges each pledge once when two charge requests overlap", async () => {
    const { user } = await createUser({
      email: "fundraiser-owner@example.com",
      stripeAccountId: "acct_owner",
    });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id);
    const fundraiser = await createFundraiser(artist.id, { goalAmount: 1000 });
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 5000 });
    const createStub = stubStripeForCharge();

    const results = await Promise.allSettled([
      chargeFundraiserPledges(fundraiser.id),
      chargeFundraiserPledges(fundraiser.id),
    ]);

    assert.equal(createStub.callCount, 1);
    assert.deepEqual(results.map((r) => r.status).sort(), [
      "fulfilled",
      "rejected",
    ]);
  });

  it("skips pledges that already have a pending or completed charge, and retries failed ones", async () => {
    const { user } = await createUser({
      email: "fundraiser-owner@example.com",
      stripeAccountId: "acct_owner",
    });
    const artist = await createArtist(user.id);
    const fundraiser = await createFundraiser(artist.id, {
      goalAmount: 1000,
      isAllOrNothing: false,
    });
    for (const [i, paymentStatus] of (
      ["PENDING", "COMPLETED", "FAILED"] as const
    ).entries()) {
      const { user: backer } = await createUser({
        email: `backer${i}@example.com`,
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id, {
        amount: 1000 + i,
      });
      await prisma.userTransaction.create({
        data: {
          userId: backer.id,
          amount: pledge.amount,
          currency: "usd",
          paymentStatus,
          associatedPledge: { connect: { id: pledge.id } },
        },
      });
    }
    const createStub = stubStripeForCharge();

    await chargeFundraiserPledges(fundraiser.id);

    assert.equal(createStub.callCount, 1);
    assert.equal(createStub.firstCall.args[0].amount, 1002);
  });

  it("leaves the fundraiser ACTIVE when charging fails, so it can be retried", async () => {
    const { user } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id);
    const fundraiser = await createFundraiser(artist.id, { goalAmount: 1000 });
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 5000 });
    const createStub = stubStripeForCharge();

    await assert.rejects(
      chargeFundraiserPledges(fundraiser.id),
      (e: AppError) => e.httpCode === 400
    );
    const afterFailure = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(afterFailure?.status, "ACTIVE");

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: "acct_owner" },
    });
    await chargeFundraiserPledges(fundraiser.id);

    assert.equal(createStub.callCount, 1);
    const afterRetry = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(afterRetry?.status, "SUCCESSFUL");
  });
});
