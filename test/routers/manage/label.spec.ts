import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";

import prisma from "@mirlo/prisma";
import { clearTables, createArtist, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("manage/label", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET /", () => {
    it("should not return deleted artists on the label's roster", async () => {
      const { user: labelUser, accessToken } = await createUser({
        email: "manage-label@example.com",
      });

      const { user: liveArtistUser } = await createUser({
        email: "live-roster-artist@example.com",
      });
      const liveArtist = await createArtist(liveArtistUser.id, {
        name: "Live Roster Profile",
        urlSlug: "live-roster-artist",
      });

      const { user: deletedArtistUser } = await createUser({
        email: "deleted-roster-artist@example.com",
      });
      const deletedArtist = await createArtist(deletedArtistUser.id, {
        name: "Deleted Roster Profile",
        urlSlug: "deleted-roster-artist",
      });

      await prisma.artistLabel.createMany({
        data: [
          {
            labelUserId: labelUser.id,
            artistId: liveArtist.id,
            isLabelApproved: true,
            isArtistApproved: true,
          },
          {
            labelUserId: labelUser.id,
            artistId: deletedArtist.id,
            isLabelApproved: true,
            isArtistApproved: true,
          },
        ],
      });

      await prisma.profile.update({
        where: { id: deletedArtist.id },
        data: { deletedAt: new Date() },
      });

      const response = await requestApp
        .get("manage/label")
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      const ids = response.body.results.map(
        (r: { artist: { id: number } }) => r.artist.id
      );
      assert.equal(ids.length, 1);
      assert.equal(ids[0], liveArtist.id);
    });

    it("returns roster artists in orderIndex order, NULLs last", async () => {
      const { user: labelUser, accessToken } = await createUser({
        email: "ordered-label@example.com",
      });

      const { user: aUser } = await createUser({
        email: "a-artist@example.com",
      });
      const a = await createArtist(aUser.id, { name: "A", urlSlug: "a" });
      const { user: bUser } = await createUser({
        email: "b-artist@example.com",
      });
      const b = await createArtist(bUser.id, { name: "B", urlSlug: "b" });
      const { user: cUser } = await createUser({
        email: "c-artist@example.com",
      });
      const c = await createArtist(cUser.id, { name: "C", urlSlug: "c" });

      // c is ordered first, a is second, b is unordered (orderIndex null)
      await prisma.artistLabel.createMany({
        data: [
          {
            labelUserId: labelUser.id,
            artistId: a.id,
            isLabelApproved: true,
            isArtistApproved: true,
            orderIndex: 2,
          },
          {
            labelUserId: labelUser.id,
            artistId: b.id,
            isLabelApproved: true,
            isArtistApproved: true,
          },
          {
            labelUserId: labelUser.id,
            artistId: c.id,
            isLabelApproved: true,
            isArtistApproved: true,
            orderIndex: 1,
          },
        ],
      });

      const response = await requestApp
        .get("manage/label")
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      const ids = response.body.results.map(
        (r: { artist: { id: number } }) => r.artist.id
      );
      assert.deepEqual(ids, [c.id, a.id, b.id]);
    });
  });

  describe("PUT /artistOrder", () => {
    it("assigns sequential orderIndex to each artistId in the request", async () => {
      const { user: labelUser, accessToken } = await createUser({
        email: "reorder-label@example.com",
      });

      const { user: aUser } = await createUser({
        email: "reorder-a@example.com",
      });
      const a = await createArtist(aUser.id, {
        name: "Reorder A",
        urlSlug: "reorder-a",
      });
      const { user: bUser } = await createUser({
        email: "reorder-b@example.com",
      });
      const b = await createArtist(bUser.id, {
        name: "Reorder B",
        urlSlug: "reorder-b",
      });

      await prisma.artistLabel.createMany({
        data: [
          {
            labelUserId: labelUser.id,
            artistId: a.id,
            isLabelApproved: true,
            isArtistApproved: true,
          },
          {
            labelUserId: labelUser.id,
            artistId: b.id,
            isLabelApproved: true,
            isArtistApproved: true,
          },
        ],
      });

      const response = await requestApp
        .put("manage/label/artistOrder")
        .send({ artistIds: [b.id, a.id] })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const bLabel = await prisma.artistLabel.findFirst({
        where: { labelUserId: labelUser.id, artistId: b.id },
      });
      const aLabel = await prisma.artistLabel.findFirst({
        where: { labelUserId: labelUser.id, artistId: a.id },
      });
      assert.equal(bLabel?.orderIndex, 1);
      assert.equal(aLabel?.orderIndex, 2);
    });

    it("does not touch ArtistLabel rows belonging to a different label", async () => {
      const { user: labelUser, accessToken } = await createUser({
        email: "owning-label@example.com",
      });
      const { user: otherLabelUser } = await createUser({
        email: "other-label@example.com",
      });

      const { user: artistUser } = await createUser({
        email: "shared-artist@example.com",
      });
      const sharedArtist = await createArtist(artistUser.id, {
        name: "Shared",
        urlSlug: "shared",
      });

      await prisma.artistLabel.create({
        data: {
          labelUserId: otherLabelUser.id,
          artistId: sharedArtist.id,
          isLabelApproved: true,
          isArtistApproved: true,
          orderIndex: 7,
        },
      });

      const response = await requestApp
        .put("manage/label/artistOrder")
        .send({ artistIds: [sharedArtist.id] })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const otherLabelRow = await prisma.artistLabel.findFirst({
        where: { labelUserId: otherLabelUser.id, artistId: sharedArtist.id },
      });
      assert.equal(otherLabelRow?.orderIndex, 7);
    });

    it("rejects a non-array body", async () => {
      const { accessToken } = await createUser({
        email: "bad-body-label@example.com",
      });

      const response = await requestApp
        .put("manage/label/artistOrder")
        .send({ artistIds: "not an array" })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 400);
    });
  });
});
