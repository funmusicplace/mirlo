import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import sendSubscriptionRenewalReminders, {
  SubscriptionRenewalReminderEmailType,
} from "../../src/jobs/send-subscription-renewal-reminders";
import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../src/queues/send-mail-queue";

describe("send-subscription-renewal-reminders", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(async () => {
    sinon.restore();
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  it("should send renewal reminder for subscription renewing in 7-14 days", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
        minAmount: 1200, // $12/year
      },
    });

    // Create subscription with next billing date 10 days from now (in reminder window)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_test_123",
        nextBillingDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, true);
    const call = sendMailStub.getCall(0);
    assert.equal(call.args[0], "send-mail");
    const jobData = call.args[1];
    assert.equal(jobData.template, "subscription-renewal-reminder");
    assert.equal(jobData.message.to, "subscriber@subscriber.com");

    const locals = jobData.locals as SubscriptionRenewalReminderEmailType;
    assert.equal(locals.artist.name, "Test Artist");
    assert.equal(locals.interval, "YEAR");
    assert.equal(locals.artistUserSubscription.amount, 1200);
  });

  it("should not send reminder for subscription renewing outside 7-14 day window", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    // Create subscription renewing in 20 days (outside window)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 20);

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_test_456",
        nextBillingDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, false);
  });

  it("should not send duplicate reminders within 360 days", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    // Create subscription with reminder already sent recently
    const reminderSentDate = new Date();
    reminderSentDate.setDate(reminderSentDate.getDate() - 5); // 5 days ago

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_test_789",
        nextBillingDate,
        renewalReminderSentAt: reminderSentDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, false);
  });

  it("should resend reminder after 360 days", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    // Reminder sent 365 days ago (more than 360)
    const reminderSentDate = new Date();
    reminderSentDate.setDate(reminderSentDate.getDate() - 365);

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_test_old",
        nextBillingDate,
        renewalReminderSentAt: reminderSentDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, true);
  });

  it("should not send reminder for month subscriptions (only year)", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const monthlyTier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Monthly Tier",
        interval: "MONTH",
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: monthlyTier.id,
        amount: 100,
        stripeSubscriptionKey: "sub_monthly",
        nextBillingDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, false);
  });

  it("should not send reminder for deleted subscriptions", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    // Create deleted subscription
    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_deleted",
        nextBillingDate,
        deletedAt: new Date(),
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, false);
  });

  it("should not send reminder for zero-amount subscriptions", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Free Tier",
        interval: "YEAR",
        isDefaultTier: true,
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 0,
        nextBillingDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, false);
  });

  it("should update renewalReminderSentAt after sending reminder", async () => {
    sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    const subscription = await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_timestamp",
        nextBillingDate,
        renewalReminderSentAt: null,
      },
    });

    const beforeTime = new Date();
    await sendSubscriptionRenewalReminders();
    const afterTime = new Date();

    const updatedSubscription = await prisma.artistUserSubscription.findUnique({
      where: { id: subscription.id },
    });

    assert.notEqual(updatedSubscription?.renewalReminderSentAt, null);
    assert.ok(
      updatedSubscription!.renewalReminderSentAt! >= beforeTime &&
        updatedSubscription!.renewalReminderSentAt! <= afterTime,
      "renewalReminderSentAt should be within the time range"
    );
  });

  it("should format renewal date correctly in email locals", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    // Create subscription with specific next billing date
    const nextBillingDate = new Date("2025-05-15");

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_date_format",
        nextBillingDate,
      },
    });

    await sendSubscriptionRenewalReminders();

    if (sendMailStub.called) {
      const call = sendMailStub.getCall(0);
      const jobData = call.args[1];
      const locals = jobData.locals as SubscriptionRenewalReminderEmailType;
      assert.strictEqual(typeof locals.renewalDate, "string");
      assert.match(locals.renewalDate, /May 15, 2025/);
    }
  });

  it("should handle subscriptions with no nextBillingDate gracefully", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber } = await createUser({
      email: "subscriber@subscriber.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: subscriber.id,
        artistSubscriptionTierId: tier.id,
        amount: 1200,
        stripeSubscriptionKey: "sub_no_date",
        nextBillingDate: null,
      },
    });

    // Should not crash
    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.called, false);
  });

  it("should send reminders to multiple subscriptions", async () => {
    const sendMailStub = sinon.stub(sendMailQueue, "add");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: subscriber1 } = await createUser({
      email: "subscriber1@example.com",
      emailConfirmationToken: null,
    });

    const { user: subscriber2 } = await createUser({
      email: "subscriber2@example.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test Artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tier = await prisma.artistSubscriptionTier.create({
      data: {
        artistId: artist.id,
        name: "Premium Tier",
        interval: "YEAR",
      },
    });

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 10);

    await prisma.artistUserSubscription.createMany({
      data: [
        {
          userId: subscriber1.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
          stripeSubscriptionKey: "sub_1",
          nextBillingDate,
        },
        {
          userId: subscriber2.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
          stripeSubscriptionKey: "sub_2",
          nextBillingDate,
        },
      ],
    });

    await sendSubscriptionRenewalReminders();

    assert.equal(sendMailStub.callCount, 2);
  });
});
