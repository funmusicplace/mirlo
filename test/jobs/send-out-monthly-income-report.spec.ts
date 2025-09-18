import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createPost, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import * as sendMail from "../../src/jobs/send-mail";
import sinon from "sinon";
import sendOutMonthlyIncomeReport from "../../src/jobs/send-out-monthy-income-report";
import { faker } from "@faker-js/faker";

describe("send-out-monthly-income-report", () => {
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

  it("should send an income report to an artist who has sales", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const aus = await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: aus.id,
        amountPaid: 5,
        paymentProcessor: "stripe",
        createdAt: faker.date.recent({
          days: 30,
          refDate: new Date(new Date().setDate(1)),
        }),
        currency: "usd",
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    assert.equal(data0.locals.userSales.length, 1);
    assert.equal(data0.locals.totalIncome, 5);
    assert.equal(data0.locals.userSales[0].amount, 5);
    assert.equal(data0.locals.userSales[0].saleType, "subscription");
  });

  it("should send an income report to an artist who has gained a tip", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
      include: {
        subscriptionTiers: true,
      },
    });

    await prisma.userArtistTip.create({
      data: {
        pricePaid: 7,
        datePurchased: faker.date.recent({
          days: 30,
          refDate: new Date(new Date().setDate(1)),
        }),
        userId: followerUser.id,
        artistId: artist.id,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    assert.equal(data0.locals.userSales.length, 1);
    assert.equal(data0.locals.totalIncome, 7);
    assert.equal(data0.locals.userSales[0].amount, 7);
    assert.equal(data0.locals.userSales[0].saleType, "tip");
  });

  it("should not send an e-mail if sale is from two months ago", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const aus = await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: aus.id,
        amountPaid: 5,
        paymentProcessor: "stripe",
        createdAt: faker.date.between({
          from: new Date(
            new Date().getFullYear(),
            new Date().getMonth() - 2,
            1
          ),
          to: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 28),
        }),
        currency: "usd",
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, false);
  });

  it("should not include sales from this current month", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const aus = await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: aus.id,
        amountPaid: 5,
        paymentProcessor: "stripe",
        createdAt: faker.date.between({
          from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          to: new Date(),
        }),
        currency: "usd",
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, false);
  });

  it("should not send an income report to an artist who's not had any sales", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, false);
  });

  it("should send an income report to different artists for different sales", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const aus = await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: aus.id,
        amountPaid: 5,
        paymentProcessor: "stripe",
        createdAt: faker.date.recent({
          days: 30,
          refDate: new Date(new Date().setDate(1)),
        }),
        currency: "usd",
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    assert.equal(data0.locals.userSales.length, 1);
    assert.equal(data0.locals.totalIncome, 5);
    assert.equal(data0.locals.userSales[0].amount, 5);
    assert.equal(data0.locals.userSales[0].saleType, "subscription");
  });

  it("should send an income report for multiple artists if a user has more than one artist sales", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
      name: "Gia",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const artist2 = await prisma.artist.create({
      data: {
        name: "Test artist 2",
        urlSlug: "test-artist-2",
        userId: artistUser.id,
        enabled: true,
      },
    });

    await prisma.userArtistTip.create({
      data: {
        pricePaid: 7,
        datePurchased: faker.date.between({
          from: new Date(
            new Date().getFullYear(),
            new Date().getMonth() - 1,
            1
          ),
          to: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 10),
        }),
        userId: followerUser.id,
        artistId: artist.id,
      },
    });

    await prisma.userArtistTip.create({
      data: {
        pricePaid: 3,
        datePurchased: faker.date.between({
          from: new Date(
            new Date().getFullYear(),
            new Date().getMonth() - 1,
            11
          ),
          to: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 20),
        }),
        userId: followerUser.id,
        artistId: artist2.id,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    assert.equal(data0.locals.userSales.length, 2);
    assert.equal(data0.locals.user.name, "Gia");
    assert.equal(data0.locals.totalIncome, 10);
    assert.equal(data0.locals.userSales[0].amount, 7);
    assert.equal(data0.locals.userSales[0].artist.id, artist.id);
    assert.equal(data0.locals.userSales[0].saleType, "tip");
    assert.equal(data0.locals.userSales[1].amount, 3);
    assert.equal(data0.locals.userSales[1].artist.id, artist2.id);
    assert.equal(data0.locals.userSales[1].saleType, "tip");
  });
});
