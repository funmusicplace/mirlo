import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("artists", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/{id}", () => {
    it("should GET /{id} with artist slug", async () => {
      const artistSlug = "test-artist";
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: artistSlug,
          userId: user.id,
          enabled: true,
        },
      });
      const response = await requestApp
        .get(`artists/${artistSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.id, artist.id);
    });

    it("should GET /{id} with wrong artist slug", async () => {
      const artistSlug = "test-artist";
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "other-artist-slug",
          userId: user.id,
          enabled: true,
        },
      });
      const response = await requestApp
        .get(`artists/${artistSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
    });

    it("should return the artist's currency on trackGroups, not 'usd'", async () => {
      const { user } = await createUser({
        email: "eur@test.com",
        currency: "eur",
      });
      const artist = await createArtist(user.id, {
        name: "Euro Artist",
        urlSlug: "euro-artist",
      });
      await createTrackGroup(artist.id, { title: "Euro Album" });

      const response = await requestApp
        .get(`artists/${artist.urlSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const trackGroup = response.body.result.trackGroups[0];
      assert.equal(trackGroup.currency, "eur");
    });

    it("should return trackGroup tracks ordered by 'order' asc", async () => {
      const { user } = await createUser({ email: "ordered@test.com" });
      const artist = await createArtist(user.id, {
        name: "Ordered Artist",
        urlSlug: "ordered-artist",
      });
      await createTrackGroup(artist.id, {
        title: "Ordered Album",
        urlSlug: "ordered-album",
        tracks: [
          { title: "third", order: 3 },
          { title: "first", order: 1 },
          { title: "second", order: 2 },
        ],
      });

      const response = await requestApp
        .get(`artists/${artist.urlSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const trackGroup = response.body.result.trackGroups[0];
      const titles = trackGroup.tracks.map((t: { title: string }) => t.title);
      assert.deepEqual(titles, ["first", "second", "third"]);
    });

    it("should return an empty user.artistLabels for a label with empty roster", async () => {
      const { user: labelUser } = await createUser({
        email: "label@test.com",
        isLabelAccount: true,
      });
      const label = await createArtist(labelUser.id, {
        name: "Empty Label",
        urlSlug: "empty-label",
        isLabelProfile: true,
      });

      const response = await requestApp
        .get(`artists/${label.urlSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.user?.artistLabels?.length ?? 0, 0);
    });

    it("should return at least one user.artistLabels entry when the roster has approved artists", async () => {
      const { user: labelUser } = await createUser({
        email: "label2@test.com",
        isLabelAccount: true,
      });
      const label = await createArtist(labelUser.id, {
        name: "Stocked Label",
        urlSlug: "stocked-label",
        isLabelProfile: true,
      });
      const { user: artistUser } = await createUser({
        email: "rosterartist@test.com",
      });
      const rosterArtist = await createArtist(artistUser.id, {
        name: "Roster Artist",
        urlSlug: "roster-artist",
      });
      await prisma.artistLabel.create({
        data: {
          artistId: rosterArtist.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
          isArtistApproved: true,
        },
      });

      const response = await requestApp
        .get(`artists/${label.urlSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.user?.artistLabels?.length, 1);
    });

    it("should not include soft-deleted roster artists in user.artistLabels", async () => {
      const { user: labelUser } = await createUser({
        email: "label3@test.com",
        isLabelAccount: true,
      });
      const label = await createArtist(labelUser.id, {
        name: "Label With Deleted Member",
        urlSlug: "label-with-deleted",
        isLabelProfile: true,
      });
      const { user: deletedArtistUser } = await createUser({
        email: "deletedrosterartist@test.com",
      });
      const deletedArtist = await createArtist(deletedArtistUser.id, {
        name: "Deleted Roster Artist",
        urlSlug: "deleted-roster-artist",
      });
      await prisma.artistLabel.create({
        data: {
          artistId: deletedArtist.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
          isArtistApproved: true,
        },
      });
      await prisma.profile.update({
        where: { id: deletedArtist.id },
        data: { deletedAt: new Date() },
      });

      const response = await requestApp
        .get(`artists/${label.urlSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.user?.artistLabels?.length ?? 0, 0);
    });

    it("should not include unapproved roster relationships in user.artistLabels", async () => {
      const { user: labelUser } = await createUser({
        email: "label4@test.com",
        isLabelAccount: true,
      });
      const label = await createArtist(labelUser.id, {
        name: "Pending Label",
        urlSlug: "pending-label",
        isLabelProfile: true,
      });
      const { user: artistUser } = await createUser({
        email: "pendingrosterartist@test.com",
      });
      const pendingArtist = await createArtist(artistUser.id, {
        name: "Pending Roster Artist",
        urlSlug: "pending-roster-artist",
      });
      await prisma.artistLabel.create({
        data: {
          artistId: pendingArtist.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
          isArtistApproved: false,
        },
      });

      const response = await requestApp
        .get(`artists/${label.urlSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.user?.artistLabels?.length ?? 0, 0);
    });
  });
});
