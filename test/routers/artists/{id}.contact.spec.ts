import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import { clearTables, createProfile, createUser } from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id}/contact", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should 401 if not logged in", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(profileOwner.id);

      const response = await requestApp
        .post(`artists/${profile.id}/contact`)
        .send({ message: "hello" })
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
    });

    it("should 400 when message is missing or blank", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@artist.com",
      });
      const { accessToken } = await createUser({
        email: "sender@sender.com",
      });
      const profile = await createProfile(profileOwner.id);

      const response = await requestApp
        .post(`artists/${profile.id}/contact`)
        .send({ message: "   " })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 400);
    });

    it("should 404 for an unknown artist", async () => {
      const { accessToken } = await createUser({
        email: "sender@sender.com",
      });

      const response = await requestApp
        .post(`artists/999999/contact`)
        .send({ message: "hi" })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 404);
    });

    it("should 400 when contacting yourself", async () => {
      const { user: profileOwner, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(profileOwner.id);

      const response = await requestApp
        .post(`artists/${profile.id}/contact`)
        .send({ message: "hi me" })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 400);
    });

    it("should 403 when artist has opted out", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@artist.com",
      });
      const { accessToken } = await createUser({
        email: "sender@sender.com",
      });
      const profile = await createProfile(profileOwner.id);
      await prisma.profile.update({
        where: { id: profile.id },
        data: { allowDirectMessages: false },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/contact`)
        .send({ message: "hello" })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 403);
    });

    it("should create a notification and return 200 on success", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@artist.com",
      });
      const { user: sender, accessToken } = await createUser({
        email: "sender@sender.com",
      });
      const profile = await createProfile(profileOwner.id, {
        allowDirectMessages: true,
      });

      const response = await requestApp
        .post(`artists/${profile.id}/contact`)
        .send({ message: "Hello artist" })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const notification = await prisma.notification.findFirst({
        where: {
          notificationType: "ARTIST_CONTACT_MESSAGE",
          profileId: profile.id,
          relatedUserId: sender.id,
        },
      });
      assert(notification);
      assert.equal(notification?.content, "Hello artist");
      assert.equal(notification?.userId, profileOwner.id);
    });

    it("should 429 after reaching the per-artist daily rate limit", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@artist.com",
      });
      const { user: sender, accessToken } = await createUser({
        email: "sender@sender.com",
      });
      const profile = await createProfile(profileOwner.id, {
        allowDirectMessages: true,
      });

      await prisma.notification.createMany({
        data: Array.from({ length: 24 }, () => ({
          notificationType: "ARTIST_CONTACT_MESSAGE" as const,
          userId: profileOwner.id,
          relatedUserId: sender.id,
          profileId: profile.id,
          content: "prior",
        })),
      });

      const response = await requestApp
        .post(`artists/${profile.id}/contact`)
        .send({ message: "one more" })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 429);
    });
  });
});
