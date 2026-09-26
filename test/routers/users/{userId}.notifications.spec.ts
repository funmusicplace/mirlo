import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createNotification,
  createProfile,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("users/{userId}/notifications", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("leaves out contact messages that were reported as spam", async () => {
    const { user: artistUser, accessToken } = await createUser({
      email: "artist@test.com",
    });
    const profile = await createProfile(artistUser.id);
    const { user: sender } = await createUser({ email: "sender@test.com" });
    const kept = await createNotification({
      userId: artistUser.id,
      notificationType: "ARTIST_CONTACT_MESSAGE",
      relatedUserId: sender.id,
      profileId: profile.id,
    });
    const reported = await createNotification({
      userId: artistUser.id,
      notificationType: "ARTIST_CONTACT_MESSAGE",
      relatedUserId: sender.id,
      profileId: profile.id,
    });
    await prisma.notification.update({
      where: { id: reported.id },
      data: { spamReportedAt: new Date() },
    });

    const response = await requestApp
      .get(
        `users/${artistUser.id}/notifications?notificationType=ARTIST_CONTACT_MESSAGE`
      )
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.total, 1);
    assert.deepEqual(
      response.body.results.map((n: { id: string }) => n.id),
      [kept.id]
    );
  });
});
