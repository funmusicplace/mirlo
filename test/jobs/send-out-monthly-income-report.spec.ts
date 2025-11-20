import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import * as sendMail from "../../src/jobs/send-mail";
import sinon from "sinon";
import sendOutMonthlyIncomeReport, {
  MonthlyIncomeReportEmailType,
} from "../../src/jobs/send-out-monthy-income-report";
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

    const chargeDate = faker.date.recent({
      days: 20,
      refDate: new Date(new Date().setDate(0)),
    });

    await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: aus.id,
        amountPaid: 5,
        paymentProcessor: "stripe",
        createdAt: chargeDate,
        currency: "usd",
      },
    });

    console.log("charge date", chargeDate);

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.userSales.length, 1);
    assert.equal(locals.totalIncome, 5);
    assert.equal(locals.userSales[0].amount, 5);
    assert.equal(locals.userSales[0].saleType, "subscription");
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

    const tip = await prisma.userArtistTip.create({
      data: {
        pricePaid: 7,
        datePurchased: faker.date.recent({
          days: 27,
          refDate: new Date(new Date().setDate(1)),
        }),
        userId: followerUser.id,
        artistId: artist.id,
      },
    });

    await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        tips: {
          connect: { id: tip.id },
        },
        amount: 7,
        createdAt: faker.date.recent({
          days: 27,
          refDate: new Date(new Date().setDate(1)),
        }),
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.userSales.length, 1);
    assert.equal(locals.totalIncome, 7);
    assert.equal(locals.userSales[0].amount, 7);
    assert.equal(locals.userSales[0].saleType, "transaction");
    assert.equal(locals.userSales[0].title, "Tip");
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

    const charge = await prisma.artistUserSubscriptionCharge.create({
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

    console.log("charge date", charge.createdAt);

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

    const charge = await prisma.artistUserSubscriptionCharge.create({
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

    console.log("charge date", charge.createdAt);

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

    const charge = await prisma.artistUserSubscriptionCharge.create({
      data: {
        artistUserSubscriptionId: aus.id,
        amountPaid: 5,
        paymentProcessor: "stripe",
        createdAt: faker.date.recent({
          days: 25,
          refDate: new Date(new Date().setDate(0)),
        }),
        currency: "usd",
      },
    });

    console.log("charge date", charge.createdAt);

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.userSales.length, 1);
    assert.equal(locals.totalIncome, 5);
    assert.equal(locals.userSales[0].amount, 5);
    assert.equal(locals.userSales[0].saleType, "subscription");
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

    const tip1date = faker.date.between({
      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      to: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 10),
    });

    const tip2date = faker.date.between({
      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 11),
      to: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 20),
    });

    const tip1 = await prisma.userArtistTip.create({
      data: {
        pricePaid: 7,
        datePurchased: tip1date,
        userId: followerUser.id,
        artistId: artist.id,
      },
    });

    const tip2 = await prisma.userArtistTip.create({
      data: {
        pricePaid: 3,
        datePurchased: tip2date,
        userId: followerUser.id,
        artistId: artist2.id,
      },
    });

    await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        tips: {
          connect: { id: tip1.id },
        },
        amount: 7,
        createdAt: tip1date,
      },
    });

    await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        tips: {
          connect: { id: tip2.id },
        },
        amount: 3,
        createdAt: tip2date,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.userSales.length, 2);
    assert.equal(locals.user.name, "Gia");
    assert.equal(locals.totalIncome, 10);
    assert.equal(locals.userSales[0].amount, 7);
    assert.equal(locals.userSales[0].artist[0].id, artist.id);
    assert.equal(locals.userSales[0].saleType, "transaction");
    assert.equal(locals.userSales[1].amount, 3);
    assert.equal(locals.userSales[1].artist[0].id, artist2.id);
    assert.equal(locals.userSales[1].saleType, "transaction");
    assert.equal(locals.userSales[0].title, "Tip");
    assert.equal(locals.userSales[1].title, "Tip");
  });
});
