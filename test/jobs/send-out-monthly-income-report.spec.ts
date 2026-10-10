import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";

import sendOutMonthlyIncomeReport, {
  MonthlyIncomeReportEmailType,
} from "../../src/jobs/send-out-monthy-income-report";
import { sendMailQueue } from "../../src/queues/send-mail-queue";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";

import assert from "assert";

import { faker } from "@faker-js/faker";

const lastDayPreviousMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  0
);

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
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const aus = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const chargeDate = faker.date.recent({
      days: 20,
      refDate: new Date(new Date().setDate(0)),
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 5,
        createdAt: chargeDate,
      },
    });
    await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: aus.id,
        createdAt: chargeDate,
        transactionId: transaction.id,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.sales.length, 0);
    assert.equal(locals.subscriptionPayments.length, 1);
    assert.equal(locals.totalIncome, 5);
    assert.equal(locals.subscriptionTotal, 5);
    assert.equal(locals.subscriptionPayments[0].amount, 5);
    assert.equal(
      locals.subscriptionPayments[0].artistUserSubscriptionCharges?.length,
      1
    );
  });

  it("should send an income report to an artist who has gained a tip", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const tip = await prisma.userProfileTip.create({
      data: {
        datePurchased: faker.date.recent({
          days: 25,
          refDate: lastDayPreviousMonth,
        }),
        userId: followerUser.id,
        profileId: artist.id,
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
        createdAt: tip.datePurchased,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.sales.length, 1);
    assert.equal(locals.subscriptionPayments.length, 0);
    assert.equal(locals.totalIncome, 7);
    assert.equal(locals.salesTotal, 7);
    assert.equal(locals.sales[0].amount, 7);
    assert.equal(locals.sales[0].saleTypeLabel, "Tip");
  });

  it("should not send an e-mail if sale is from two months ago", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const aus = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const createdDate = faker.date.between({
      from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
      to: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 28),
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 5,
        createdAt: createdDate,
      },
    });

    const charge = await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: aus.id,
        createdAt: createdDate,
        transactionId: transaction.id,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, false);
  });

  it("should not include sales from this current month", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const aus = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const date = faker.date.between({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 5,
        createdAt: date,
      },
    });

    const charge = await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: aus.id,
        createdAt: date,
        transactionId: transaction.id,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, false);
  });

  it("should not send an income report to an artist who's not had any sales", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, false);
  });

  it("should send an income report to different artists for different sales", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: artistUser2 } = await createUser({
      email: "artist2@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const artist2 = await prisma.profile.create({
      data: {
        name: "Test artist 2",
        urlSlug: "test-artist-2",
        userId: artistUser2.id,
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

    const aus = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const createdDate = faker.date.recent({
      days: 25,
      refDate: lastDayPreviousMonth,
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 5,
        createdAt: createdDate,
      },
    });

    await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: aus.id,
        createdAt: createdDate,
        transactionId: transaction.id,
      },
    });

    const tip = await prisma.userProfileTip.create({
      data: {
        datePurchased: faker.date.recent({
          days: 10,
          refDate: lastDayPreviousMonth,
        }),
        userId: followerUser.id,
        profileId: artist2.id,
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
        createdAt: tip.datePurchased,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.subscriptionPayments.length, 1);
    assert.equal(locals.totalIncome, 5);
    assert.equal(locals.subscriptionPayments[0].amount, 5);
    assert.equal(locals.subscriptionPayments[0].artist[0]?.id, artist.id);

    const data1 = stub.getCall(1).args[1];
    assert.equal(data1.template, "announce-monthly-income-report");
    assert.equal(data1.message.to, "artist2@artist.com");
    const locals2 = data1.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals2.sales.length, 1);
    assert.equal(locals2.totalIncome, 7);
    assert.equal(locals2.sales[0].amount, 7);
    assert.equal(locals2.sales[0].artist[0]?.id, artist2.id);
  });

  it("should include buyer details and last month's cancellations, excluding tier switches", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      name: "Fan",
      emailConfirmationToken: null,
    });

    const { user: leaverUser } = await createUser({
      email: "leaver@leaver.com",
      name: "Leaver",
      emailConfirmationToken: null,
    });

    const { user: switcherUser } = await createUser({
      email: "switcher@switcher.com",
      emailConfirmationToken: null,
    });

    const artist = await createArtist(artistUser.id, {
      subscriptionTiers: { create: { name: "a tier" } },
    });

    const aus = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const lastMonthDate = faker.date.recent({
      days: 20,
      refDate: lastDayPreviousMonth,
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 5,
        createdAt: lastMonthDate,
      },
    });
    await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: aus.id,
        createdAt: lastMonthDate,
        transactionId: transaction.id,
      },
    });

    // Cancelled last month: should appear in the report
    await prisma.profileUserSubscription.create({
      data: {
        userId: leaverUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 700,
        deletedAt: lastMonthDate,
        deleteReason: "USER_CANCELLED",
      },
    });

    // Tier switch last month: not lost income, should be excluded
    await prisma.profileUserSubscription.create({
      data: {
        userId: switcherUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 300,
        deletedAt: lastMonthDate,
        deleteReason: "TIER_SWITCHED",
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[1];
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.subscriptionPayments.length, 1);
    assert.equal(locals.subscriptionPayments[0].user.name, "Fan");
    assert.equal(
      locals.subscriptionPayments[0].user.email,
      "follower@follower.com"
    );
    assert.equal(typeof locals.subscriptionPayments[0].datePurchased, "string");
    assert.equal(locals.cancelledSubscriptions.length, 1);
    assert.equal(locals.cancelledSubscriptions[0].user.name, "Leaver");
    assert.equal(locals.cancelledSubscriptions[0].amount, 700);
    assert.equal(
      locals.cancelledSubscriptions[0].deleteReason,
      "USER_CANCELLED"
    );
  });

  it("should send an income report for multiple artists if a user has more than one artist sales", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
      name: "Gia",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const artist2 = await prisma.profile.create({
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

    const tip1 = await prisma.userProfileTip.create({
      data: {
        datePurchased: tip1date,
        userId: followerUser.id,
        profileId: artist.id,
      },
    });

    const tip2 = await prisma.userProfileTip.create({
      data: {
        datePurchased: tip2date,
        userId: followerUser.id,
        profileId: artist2.id,
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
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "announce-monthly-income-report");
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.sales.length, 2);
    assert.equal(locals.user.name, "Gia");
    assert.equal(locals.totalIncome, 10);
    assert.equal(locals.sales[0].amount, 7);
    assert.equal(locals.sales[0].artist[0].id, artist.id);
    assert.equal(locals.sales[1].amount, 3);
    assert.equal(locals.sales[1].artist[0].id, artist2.id);
    assert.equal(locals.sales[0].saleTypeLabel, "Tip");
    assert.equal(locals.sales[1].saleTypeLabel, "Tip");
  });

  it("should list each transaction once, splitting sales from subscription payments", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });
    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await createArtist(artistUser.id, {
      subscriptionTiers: { create: { name: "a tier" } },
    });
    const trackGroup = await createTrackGroup(artist.id);

    const lastMonthDate = faker.date.recent({
      days: 20,
      refDate: lastDayPreviousMonth,
    });

    const aus = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 500,
      },
    });
    const subscriptionTransaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 500,
        createdAt: lastMonthDate,
      },
    });
    await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: aus.id,
        createdAt: lastMonthDate,
        transactionId: subscriptionTransaction.id,
      },
    });

    const albumTransaction = await prisma.userTransaction.create({
      data: {
        currency: "usd",
        userId: followerUser.id,
        amount: 1200,
        createdAt: lastMonthDate,
      },
    });
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: followerUser.id,
        trackGroupId: trackGroup.id,
        userTransactionId: albumTransaction.id,
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const locals = stub.getCall(0).args[1]
      .locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.sales.length, 1);
    assert.equal(locals.sales[0].saleTypeLabel, "Album");
    assert.equal(locals.subscriptionPayments.length, 1);
    assert.equal(locals.salesTotal, 1200);
    assert.equal(locals.subscriptionTotal, 500);
    assert.equal(locals.totalIncome, 1700);
    assert.equal(locals.currency, "usd");
  });

  it("should send a report to an artist whose only news is a cancellation", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });
    const { user: leaverUser } = await createUser({
      email: "leaver@leaver.com",
      name: "Leaver",
      emailConfirmationToken: null,
    });

    const artist = await createArtist(artistUser.id, {
      subscriptionTiers: { create: { name: "a tier" } },
    });

    await prisma.profileUserSubscription.create({
      data: {
        userId: leaverUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 700,
        deletedAt: faker.date.recent({
          days: 20,
          refDate: lastDayPreviousMonth,
        }),
        deleteReason: "USER_CANCELLED",
      },
    });

    await sendOutMonthlyIncomeReport();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.message.to, "artist@artist.com");
    const locals = data0.locals as MonthlyIncomeReportEmailType;
    assert.equal(locals.sales.length, 0);
    assert.equal(locals.subscriptionPayments.length, 0);
    assert.equal(locals.totalIncome, 0);
    assert.equal(locals.cancelledSubscriptions.length, 1);
    assert.equal(locals.cancelledSubscriptions[0].user.name, "Leaver");
  });
});
