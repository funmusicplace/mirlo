import * as assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../../../src/queues/send-mail-queue";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

import prisma from "@mirlo/prisma";

const setup = async () => {
  const { user: owner, accessToken: ownerToken } = await createUser({
    email: "owner@test.com",
  });
  const { user: manager, accessToken: managerToken } = await createUser({
    email: "manager@test.com",
  });
  const artist = await createProfile(owner.id, { name: "Shared artist" });
  return { owner, ownerToken, manager, managerToken, artist };
};

const acceptInvite = async (artistId: number, userId: number) =>
  prisma.profileManager.updateMany({
    where: { profileId: artistId, userId },
    data: { acceptedAt: new Date() },
  });

describe("manage/artists/{artistId}/managers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  after(async () => {
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  describe("POST", () => {
    it("lets the owner invite an existing user by email", async () => {
      const { ownerToken, manager, artist } = await setup();

      const response = await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "Manager@Test.com" });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].userId, manager.id);
      assert.equal(response.body.results[0].acceptedAt, null);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: manager.id,
          notificationType: "PROFILE_MANAGER_INVITE",
        },
      });
      assert.ok(notification);
    });

    it("does not give access before the invite is accepted", async () => {
      const { ownerToken, managerToken, artist } = await setup();

      await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "manager@test.com" });

      const response = await requestApp
        .get(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(response.statusCode, 404);
    });

    it("returns 404 for an email without an account", async () => {
      const { ownerToken, artist } = await setup();

      const response = await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "nobody@test.com" });
      assert.equal(response.statusCode, 404);
    });

    it("rejects inviting the owner or inviting twice", async () => {
      const { ownerToken, artist } = await setup();

      const ownerInvite = await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "owner@test.com" });
      assert.equal(ownerInvite.statusCode, 400);

      await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "manager@test.com" });
      const secondInvite = await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "manager@test.com" });
      assert.equal(secondInvite.statusCode, 409);
    });

    it("does not let a manager invite other managers", async () => {
      const { owner, manager, managerToken, artist } = await setup();
      await createUser({ email: "third@test.com" });
      await prisma.profileManager.create({
        data: {
          profileId: artist.id,
          userId: manager.id,
          invitedById: owner.id,
          acceptedAt: new Date(),
        },
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${managerToken}`])
        .send({ email: "third@test.com" });
      assert.equal(response.statusCode, 403);
    });
  });

  describe("accepting and declining", () => {
    it("lists pending invites and grants access on accept", async () => {
      const { ownerToken, managerToken, artist } = await setup();
      await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "manager@test.com" });

      const invites = await requestApp
        .get(`manage/artistInvites`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(invites.statusCode, 200);
      assert.equal(invites.body.results.length, 1);
      assert.equal(invites.body.results[0].artist.id, artist.id);

      const accept = await requestApp
        .put(`manage/artistInvites/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(accept.statusCode, 200);

      const manage = await requestApp
        .get(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(manage.statusCode, 200);
    });

    it("removes the invite when declined", async () => {
      const { ownerToken, managerToken, artist } = await setup();
      await requestApp
        .post(`manage/artists/${artist.id}/managers`)
        .set("Cookie", [`jwt=${ownerToken}`])
        .send({ email: "manager@test.com" });

      const decline = await requestApp
        .delete(`manage/artistInvites/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(decline.statusCode, 200);
      assert.equal(await prisma.profileManager.count(), 0);
    });

    it("returns 404 when accepting an invite that doesn't exist", async () => {
      const { managerToken, artist } = await setup();
      const response = await requestApp
        .put(`manage/artistInvites/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(response.statusCode, 404);
    });
  });

  describe("what an accepted manager can do", () => {
    const setupWithManager = async () => {
      const context = await setup();
      await prisma.profileManager.create({
        data: {
          profileId: context.artist.id,
          userId: context.manager.id,
          invitedById: context.owner.id,
        },
      });
      await acceptInvite(context.artist.id, context.manager.id);
      return context;
    };

    it("lists the artist as managed, and as owned for the owner", async () => {
      const { ownerToken, managerToken, artist } = await setupWithManager();

      const managerList = await requestApp
        .get(`manage/artists`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(managerList.body.results.length, 1);
      assert.equal(managerList.body.results[0].id, artist.id);
      assert.equal(managerList.body.results[0].relationship, "manager");

      const ownerList = await requestApp
        .get(`manage/artists`)
        .set("Cookie", [`jwt=${ownerToken}`]);
      assert.equal(ownerList.body.results[0].relationship, "owner");
    });

    it("can edit the artist", async () => {
      const { managerToken, artist } = await setupWithManager();
      const response = await requestApp
        .put(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`])
        .send({ name: "Renamed" });
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "Renamed");
    });

    it("cannot change where payments go", async () => {
      const { managerToken, manager, artist } = await setupWithManager();
      const response = await requestApp
        .put(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`])
        .send({ paymentToUserId: manager.id });
      assert.equal(response.statusCode, 403);
    });

    it("can save the form when paymentToUserId is unchanged", async () => {
      const { managerToken, artist } = await setupWithManager();
      const response = await requestApp
        .put(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`])
        .send({ name: "Renamed", paymentToUserId: null });
      assert.equal(response.statusCode, 200);
    });

    it("cannot delete the artist", async () => {
      const { managerToken, artist } = await setupWithManager();
      const response = await requestApp
        .delete(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(response.statusCode, 403);
      const stillThere = await prisma.profile.findFirst({
        where: { id: artist.id },
      });
      assert.ok(stillThere);
    });

    it("cannot move a release to their own artist", async () => {
      const { manager, managerToken, artist } = await setupWithManager();
      const ownArtist = await createProfile(manager.id, {
        name: "Manager's own",
      });
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .set("Cookie", [`jwt=${managerToken}`])
        .send({ moveToArtistId: ownArtist.id });
      assert.equal(response.statusCode, 403);
    });

    it("cannot approve or remove labels", async () => {
      const { managerToken, artist } = await setupWithManager();
      const { user: labelUser } = await createUser({ email: "label@test.com" });
      await prisma.artistLabel.create({
        data: {
          artistId: artist.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
          isArtistApproved: false,
        },
      });

      const approve = await requestApp
        .put(`manage/artists/${artist.id}/labels/${labelUser.id}`)
        .set("Cookie", [`jwt=${managerToken}`])
        .send({ isArtistApproved: true });
      assert.equal(approve.statusCode, 403);

      const remove = await requestApp
        .delete(`manage/artists/${artist.id}/labels/${labelUser.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(remove.statusCode, 403);

      const label = await prisma.artistLabel.findFirstOrThrow({
        where: { artistId: artist.id },
      });
      assert.equal(label.isArtistApproved, false);
    });

    it("loses access when the owner removes them", async () => {
      const { ownerToken, manager, managerToken, artist } =
        await setupWithManager();

      const remove = await requestApp
        .delete(`manage/artists/${artist.id}/managers/${manager.id}`)
        .set("Cookie", [`jwt=${ownerToken}`]);
      assert.equal(remove.statusCode, 200);
      assert.equal(remove.body.results.length, 0);

      const manage = await requestApp
        .get(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(manage.statusCode, 404);
    });

    it("cannot remove other managers", async () => {
      const { owner, managerToken, artist } = await setupWithManager();
      const { user: other } = await createUser({ email: "other@test.com" });
      await prisma.profileManager.create({
        data: {
          profileId: artist.id,
          userId: other.id,
          invitedById: owner.id,
          acceptedAt: new Date(),
        },
      });

      const response = await requestApp
        .delete(`manage/artists/${artist.id}/managers/${other.id}`)
        .set("Cookie", [`jwt=${managerToken}`]);
      assert.equal(response.statusCode, 403);
      assert.equal(
        await prisma.profileManager.count({ where: { profileId: artist.id } }),
        2
      );
    });
  });
});
