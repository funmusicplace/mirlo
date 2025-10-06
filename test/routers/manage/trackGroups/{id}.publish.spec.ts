import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";
import prisma from "@mirlo/prisma";

describe("manage/trackGroups/{trackGroupId}/publish", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (error) {
      console.error(error);
    }
  });

  describe("PUT", () => {
    it("should publish a track group when a cover is present", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        published: false,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.equal(updatedTrackGroup?.published, true);
      assert.ok(updatedTrackGroup?.publishedAt);
    });

    it("should reject publishing when the track group has no cover", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-no-cover@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        published: false,
      });

      await prisma.trackGroupCover.delete({
        where: { trackGroupId: trackGroup.id },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const unchangedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.equal(unchangedTrackGroup?.published, false);
      assert.equal(unchangedTrackGroup?.publishedAt, null);
    });

    it("should publish a track group without tracks when fundraising", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-goal@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        published: false,
        tracks: [],
        fundraisingGoal: 1000,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.equal(updatedTrackGroup?.published, true);
      assert.ok(updatedTrackGroup?.publishedAt);
    });

    it("should publish even if track audio is still processing", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-processing-tracks@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        published: false,
      });

      const track = await prisma.track.findFirst({
        where: { trackGroupId: trackGroup.id },
      });

      await prisma.trackAudio.updateMany({
        where: { trackId: track?.id },
        data: { uploadState: "STARTED" },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.equal(updatedTrackGroup?.published, true);
      assert.ok(updatedTrackGroup?.publishedAt);
    });
  });
});
