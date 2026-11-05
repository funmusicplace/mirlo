import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import setupIntentStatus from "../../../src/routers/v1/stripe/setupIntentStatus";
import * as stripeUtils from "../../../src/utils/stripe";
import {
  clearTables,
  createFundraiser,
  createFundraiserPledge,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";

describe("stripe/setupIntentStatus", () => {
  beforeEach(async () => {
    await clearTables();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("reports a pledge's status without reinstating a cancelled pledge", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_status",
    });
    const { user: backer } = await createUser({ email: "backer@test.com" });
    const profile = await createProfile(artistUser.id);
    const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
    const fundraiser = await createFundraiser(profile.id, {
      trackGroupId: trackGroup.id,
    });
    const cancelledAt = new Date();
    await createFundraiserPledge(fundraiser.id, backer.id, {
      amount: 2000,
      stripeSetupIntentId: "seti_status",
      cancelledAt,
    });
    sinon.stub(stripeUtils.stripe.setupIntents, "retrieve").resolves({
      id: "seti_status",
      status: "succeeded",
      metadata: {
        fundraiserId: String(fundraiser.id),
        trackGroupId: String(trackGroup.id),
        userId: String(backer.id),
        paymentIntentAmount: "2000",
        currency: "usd",
      },
    } as unknown as Stripe.Response<Stripe.SetupIntent>);

    const json = sinon.stub();
    const res = { status: sinon.stub().returnsThis(), json };
    const next = sinon.stub();
    await setupIntentStatus().GET[1](
      {
        query: { setupIntent: "seti_status", stripeAccountId: "acct_status" },
      } as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );

    assert.equal(next.called, false);
    assert.deepEqual(json.firstCall.args[0].result, {
      status: "succeeded",
      paymentIntentAmount: "2000",
      trackGroupId: String(trackGroup.id),
    });
    const pledge = await prisma.fundraiserPledge.findFirstOrThrow({
      where: { fundraiserId: fundraiser.id, userId: backer.id },
    });
    assert.deepEqual(pledge.cancelledAt, cancelledAt);
  });
});
