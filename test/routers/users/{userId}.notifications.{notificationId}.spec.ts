import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createNotification,
  createProfile,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

const seedArtist = async () => {
  const { user, accessToken } = await createUser({
    email: "artist@test.com",
  });
  const profile = await createProfile(user.id);
  return { user, accessToken, profile };
};

describe("users/{userId}/notifications/{notificationId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("DELETE", () => {
    it("removes a fediverse mention from the feed", async () => {
      const { user, accessToken, profile } = await seedArtist();
      const notification = await createNotification({
        userId: user.id,
        notificationType: "AP_MENTION",
        profileId: profile.id,
      });

      const response = await requestApp
        .delete(`users/${user.id}/notifications/${notification.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const stored = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      assert.equal(stored, null);
    });

    it("refuses to remove other notification types", async () => {
      const { user, accessToken, profile } = await seedArtist();
      const notification = await createNotification({
        userId: user.id,
        notificationType: "USER_FOLLOWED_YOU",
        profileId: profile.id,
      });

      const response = await requestApp
        .delete(`users/${user.id}/notifications/${notification.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      const stored = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      assert.ok(stored);
    });

    it("returns 404 for a notification that belongs to someone else", async () => {
      const { user, profile } = await seedArtist();
      const { user: otherUser, accessToken: otherToken } = await createUser({
        email: "other@test.com",
      });
      const notification = await createNotification({
        userId: user.id,
        notificationType: "AP_MENTION",
        profileId: profile.id,
      });

      const response = await requestApp
        .delete(`users/${otherUser.id}/notifications/${notification.id}`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      const stored = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      assert.ok(stored);
    });

    it("returns 401 when the path user is not the logged-in user", async () => {
      const { user, profile } = await seedArtist();
      const { accessToken: otherToken } = await createUser({
        email: "other@test.com",
      });
      const notification = await createNotification({
        userId: user.id,
        notificationType: "AP_MENTION",
        profileId: profile.id,
      });

      const response = await requestApp
        .delete(`users/${user.id}/notifications/${notification.id}`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });
  });
});
