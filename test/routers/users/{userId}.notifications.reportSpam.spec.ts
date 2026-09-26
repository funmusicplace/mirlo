import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  SPAM_STRIKES_PER_TRUST_LEVEL_DROP,
  SPAM_STRIKES_TO_DISABLE,
} from "../../../src/utils/spamStrikes";
import {
  clearTables,
  createNotification,
  createProfile,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

const seedArtistAndSender = async (senderTrustLevel: number) => {
  const { user: artistUser, accessToken } = await createUser({
    email: "artist@test.com",
  });
  const profile = await createProfile(artistUser.id);
  const { user: sender } = await createUser({
    email: "sender@test.com",
    trustLevel: senderTrustLevel,
  });
  const report = async () => {
    const notification = await createNotification({
      userId: artistUser.id,
      notificationType: "ARTIST_CONTACT_MESSAGE",
      relatedUserId: sender.id,
      profileId: profile.id,
    });
    return requestApp
      .post(
        `users/${artistUser.id}/notifications/${notification.id}/reportSpam`
      )
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");
  };
  return { artistUser, accessToken, sender, profile, report };
};

const senderState = async (senderId: number) => {
  const user = await prisma.user.findUnique({ where: { id: senderId } });
  const changes = await prisma.userTrustLevelChange.findMany({
    where: { userId: senderId },
    orderBy: { createdAt: "asc" },
  });
  const flags = await prisma.contentFlag.findMany({
    where: { reportedUserId: senderId },
    orderBy: { createdAt: "asc" },
  });
  return { user, changes, flags };
};

describe("users/{userId}/notifications/{notificationId}/reportSpam", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("records the flag without touching the trust level on the first strike", async () => {
    const { sender, report } = await seedArtistAndSender(3);

    const response = await report();

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.result.spamReportedAt);
    const { user, changes, flags } = await senderState(sender.id);
    assert.equal(flags.length, 1);
    assert.equal(flags[0].reason, "spamContactMessage");
    assert.equal(user?.trustLevel, 3);
    assert.equal(changes.length, 0);
  });

  it("lowers the trust level by one every few strikes and links the change to the flag", async () => {
    const { sender, report } = await seedArtistAndSender(3);

    for (let i = 0; i < SPAM_STRIKES_PER_TRUST_LEVEL_DROP; i++) {
      assert.equal((await report()).statusCode, 200);
    }

    const { user, changes, flags } = await senderState(sender.id);
    assert.equal(user?.trustLevel, 2);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].fromLevel, 3);
    assert.equal(changes[0].toLevel, 2);
    assert.equal(changes[0].reason, "SPAM_REPORTED");
    assert.equal(changes[0].changedByUserId, null);
    assert.equal(changes[0].contentFlagId, flags[flags.length - 1].id);
    assert.deepEqual(
      flags.map((flag) => flag.spamStrikeNumber),
      [1, 2]
    );
    assert.equal(user?.spamStrikes, 2);
  });

  it("disables the account and drops it to New when the strikes reach the limit", async () => {
    const { sender, report } = await seedArtistAndSender(3);

    for (let i = 0; i < SPAM_STRIKES_TO_DISABLE; i++) {
      assert.equal((await report()).statusCode, 200);
    }

    const { user, changes } = await senderState(sender.id);
    assert.ok(user?.disabledAt);
    assert.equal(user?.trustLevel, 0);
    assert.equal(changes[changes.length - 1].toLevel, 0);
    assert.equal(changes[changes.length - 1].reason, "SPAM_REPORTED");
  });

  it("disables the account again on the next strike when it was re-enabled without a reset", async () => {
    const { sender, report } = await seedArtistAndSender(3);
    for (let i = 0; i < SPAM_STRIKES_TO_DISABLE; i++) {
      await report();
    }
    await prisma.user.update({
      where: { id: sender.id },
      data: { disabledAt: null },
    });

    const { changes: changesBefore } = await senderState(sender.id);

    assert.equal((await report()).statusCode, 200);

    const { user, changes } = await senderState(sender.id);
    assert.ok(user?.disabledAt);
    assert.equal(user?.spamStrikes, SPAM_STRIKES_TO_DISABLE + 1);
    assert.equal(user?.trustLevel, 0);
    assert.equal(changes.length, changesBefore.length);
  });

  it("only counts strikes received after the last reset", async () => {
    const { sender, report } = await seedArtistAndSender(3);
    for (let i = 0; i < SPAM_STRIKES_PER_TRUST_LEVEL_DROP - 1; i++) {
      await report();
    }
    await prisma.user.update({
      where: { id: sender.id },
      data: { spamStrikes: 0 },
    });

    assert.equal((await report()).statusCode, 200);

    const { user, changes } = await senderState(sender.id);
    assert.equal(user?.trustLevel, 3);
    assert.equal(changes.length, 0);
  });

  it("does nothing the second time the same message is reported", async () => {
    const { artistUser, accessToken, sender, profile } =
      await seedArtistAndSender(3);
    const notification = await createNotification({
      userId: artistUser.id,
      notificationType: "ARTIST_CONTACT_MESSAGE",
      relatedUserId: sender.id,
      profileId: profile.id,
    });

    for (let i = 0; i < 2; i++) {
      const response = await requestApp
        .post(
          `users/${artistUser.id}/notifications/${notification.id}/reportSpam`
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 200);
    }

    const { flags } = await senderState(sender.id);
    assert.equal(flags.length, 1);
  });
});
