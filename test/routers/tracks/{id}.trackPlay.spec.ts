import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
  createTrackPlay,
} from "../../utils";
import { requestApp } from "../utils";

describe("register trackPlays", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

    it("should GET / 404", async () => {
      const response = await requestApp
        .get("tracks/1/trackPlay")
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

  it("should GET /{id}/trackPlay when not logged in", async () => {
    const { user } = await createUser({
      email: "artist@artist.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id, {
      title: "test track",
      description: "This is a test description",
    });
    
    const response = await requestApp
      .get("tracks/" + track.id +"/trackPlay")
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
  });

  it("should GET /{id}/trackPlay when logged in", async () => {
    const { user, accessToken } = await createUser({
      email: "artist@artist.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id, {
      title: "test track",
      description: "This is a test description",
    });

    const response = await requestApp
      .get("tracks/" + track.id +"/trackPlay")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
  });

  describe("playLimit response (#1760)", () => {
    it("returns playLimit: null when artist has no maxFreePlays", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-no-limit@example.com",
      });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id, {
        title: "no-limit track",
        isPreview: true,
      });

      const { accessToken } = await createUser({
        email: "listener-no-limit@example.com",
      });
      const response = await requestApp
        .get(`tracks/${track.id}/trackPlay`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.playLimit, null);
    });

    it("returns remaining plays for a limited preview track", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-limited@example.com",
      });
      const artist = await createArtist(artistUser.id);
      // Set the artist's free-play cap.
      await prisma.artist.update({
        where: { id: artist.id },
        data: { maxFreePlays: 3 },
      });
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id, {
        title: "limited track",
        isPreview: true,
      });

      const { user: listener, accessToken } = await createUser({
        email: "listener-limited@example.com",
      });
      // Pre-seed two prior plays so this call yields a third => 0 remaining.
      await createTrackPlay(track.id);
      await prisma.trackPlay.updateMany({
        where: { trackId: track.id },
        data: { userId: listener.id },
      });
      await createTrackPlay(track.id);
      await prisma.trackPlay.updateMany({
        where: { trackId: track.id, userId: null },
        data: { userId: listener.id },
      });

      const response = await requestApp
        .get(`tracks/${track.id}/trackPlay`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const playLimit = response.body.result.playLimit;
      assert(playLimit, "expected playLimit on the response");
      assert.equal(playLimit.max, 3);
      // Three plays now exist (two pre-seeded + this one), 3 - 3 = 0 remaining.
      assert.equal(playLimit.remaining, 0);
      assert.equal(playLimit.exceeded, true);
    });

    it("returns playLimit: null when the listener already owns the album", async () => {
      const { user: artistUser } = await createUser({
        email: "artist-owned@example.com",
      });
      const artist = await createArtist(artistUser.id);
      await prisma.artist.update({
        where: { id: artist.id },
        data: { maxFreePlays: 3 },
      });
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id, {
        title: "owned track",
        isPreview: true,
      });

      const { user: listener, accessToken } = await createUser({
        email: "listener-owns@example.com",
      });
      const transaction = await prisma.userTransaction.create({
        data: {
          userId: listener.id,
          amount: 1000,
          currency: "usd",
          paymentStatus: "COMPLETED",
        },
      });
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: listener.id,
          trackGroupId: trackGroup.id,
          userTransactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`tracks/${track.id}/trackPlay`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.playLimit, null);
    });
  });
});
