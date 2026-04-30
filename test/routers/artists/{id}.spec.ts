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
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should GET /{id} with artist slug", async () => {
      const artistSlug = "test-artist";
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      const artist = await prisma.artist.create({
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
      await prisma.artist.create({
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

    it("should return user._count.artistLabels = 0 for a label with empty roster", async () => {
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
      assert.equal(response.body.result.user?._count?.artistLabels, 0);
    });

    it("should return user._count.artistLabels matching the roster size", async () => {
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
      assert.equal(response.body.result.user?._count?.artistLabels, 1);
    });
  });
});
