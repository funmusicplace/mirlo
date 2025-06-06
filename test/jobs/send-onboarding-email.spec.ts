import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createPost, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../src/queues/send-mail-queue";
import sendOnboardingEmail from "../../src/jobs/send-onboarding-email";
import { faker } from "@faker-js/faker";

describe("send-onboarding-email", () => {
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

  after(async () => {
    // Gotta make sure to close the queues and queue events
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  it("should send onboarding email to user with artists", async () => {
    // const stub = sinon.stub(sendMail, "default");
    const stub = sinon.stub(sendMailQueue, "add");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
      receivePlatformEmails: true,
      emailConfirmationToken: null,
      createdAt: faker.date.recent({ days: 3, refDate: yesterday }), // Set to a date in the past
    });

    await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    await sendOnboardingEmail();

    const refreshedUser = await prisma.user.findUnique({
      where: { id: artistUser.id },
    });
    assert.equal(refreshedUser?.onboardingEmailsSent.length, 1);
    assert.equal(refreshedUser?.onboardingEmailsSent[0], "payment-processor");

    assert.equal(stub.calledOnce, true);
    const args = stub.getCall(0).args;
    assert.equal(args[0], "send-mail");
    const data = args[1];
    assert.equal(data.template, "admin-announcement");
  });

  it("should not send onboarding email to user who recently received an email", async () => {
    const stub = sinon.stub(sendMailQueue, "add");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
      receivePlatformEmails: true,
      emailConfirmationToken: null,
      lastOnboardingEmailSentAt: faker.date.recent({
        days: 3,
        refDate: yesterday,
      }),
    });

    await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    await sendOnboardingEmail();

    const refreshedUser = await prisma.user.findUnique({
      where: { id: artistUser.id },
    });
    assert.equal(refreshedUser?.onboardingEmailsSent.length, 0);
    assert.equal(stub.calledOnce, false);
  });

  it("should send onboarding email to user who received an email more than two days ago", async () => {
    const stub = sinon.stub(sendMailQueue, "add");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
      receivePlatformEmails: true,
      emailConfirmationToken: null,
      createdAt: faker.date.recent({ days: 3, refDate: yesterday }),
      lastOnboardingEmailSentAt: faker.date.recent({
        days: 3,
        refDate: yesterday,
      }),
    });

    await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    await sendOnboardingEmail();

    const refreshedUser = await prisma.user.findUnique({
      where: { id: artistUser.id },
    });
    assert.equal(refreshedUser?.onboardingEmailsSent.length, 1);
    assert.equal(refreshedUser?.onboardingEmailsSent[0], "payment-processor");

    assert.equal(stub.calledOnce, true);
  });
});
