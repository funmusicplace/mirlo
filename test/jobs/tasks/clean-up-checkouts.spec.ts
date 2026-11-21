import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import cleanUpCheckouts, {
  CHECKOUT_LIFETIME_DAYS,
} from "../../../src/jobs/tasks/clean-up-checkouts";
import { clearTables, createProfile, createUser } from "../../utils";

describe("clean-up-checkouts", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("deletes checkouts older than their lifetime, paid or never paid for, and keeps newer ones", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const profile = await createProfile(user.id);
    const expired = new Date();
    expired.setDate(expired.getDate() - CHECKOUT_LIFETIME_DAYS - 1);

    await prisma.checkout.createMany({
      data: [
        { profileId: profile.id, items: [], createdAt: expired },
        {
          profileId: profile.id,
          items: [],
          createdAt: expired,
          completedAt: expired,
        },
        {
          profileId: profile.id,
          items: [],
          createdAt: expired,
          completedAt: expired,
          stripeId: "pi_paid",
          stripeAccountId: "acct_test",
        },
      ],
    });
    const recent = await prisma.checkout.create({
      data: { profileId: profile.id, items: [] },
    });

    await cleanUpCheckouts();

    const left = await prisma.checkout.findMany({ select: { id: true } });
    assert.deepEqual(left, [{ id: recent.id }]);
  });

  it("keeps an expired checkout whose payment hasn't finished", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const profile = await createProfile(user.id);
    const expired = new Date();
    expired.setDate(expired.getDate() - CHECKOUT_LIFETIME_DAYS - 1);

    const unfinished = await prisma.checkout.create({
      data: {
        profileId: profile.id,
        items: [],
        createdAt: expired,
        stripeId: "pi_processing",
        stripeAccountId: "acct_test",
      },
    });

    await cleanUpCheckouts();

    const left = await prisma.checkout.findMany({ select: { id: true } });
    assert.deepEqual(left, [{ id: unfinished.id }]);
  });
});
