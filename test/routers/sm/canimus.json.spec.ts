import assert from "node:assert";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createArtist,
  createClient,
  createTrack,
  createUser,
  createTrackGroup,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

export const createFederatedArtistWithMusic = async (
  userId: number,
  data?: Partial<Prisma.ProfileCreateArgs["data"]>
) => {
  const artist = await createArtist(userId, {
    name: "test-artist",
    urlSlug: "test-artist",
    federatedStreaming: true,
    federatedStreamingOptInDate: new Date(Date.now()),
    ...data,
  });
  // the default track group includes one test track
  const trackGroup = await createTrackGroup(artist.id);
  return artist;
};

describe("canimus", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });
  describe("/", () => {
    it("should GET / with root info and no artist federated children nor deleted", async () => {
      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(response.body.type, "root");
      assert.equal(response.body.children.length, 0);
      assert.equal(response.body.deleted.length, 0);
    });

    it("should GET / with 1 artist federated with 1 track group and 1 track", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      await createFederatedArtistWithMusic(user.id);

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");

      const artists = response.body.children;
      const albums = artists[0].children;
      const tracks = albums[0].children;
      assert.equal(artists.length, 1);
      assert.equal(albums.length, 1);
      assert.equal(tracks.length, 1);
      assert.equal(tracks[0].media.length, 1);
      assert.equal(response.body.deleted.length, 0);
    });

    it("should GET / for tracks that are 'buy only', do not include media in the feed", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id, {
        name: "buy-only-artist",
        urlSlug: "buy-only-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: new Date(Date.now()),
      });
      const trackGroup = await createTrackGroup(artist.id, { tracks: [] });
      await createTrack(trackGroup.id, {
        title: "money for something",
        audio: {
          create: {
            uploadState: "SUCCESS",
          },
        },
        isPreview: false,
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");

      const artists = response.body.children;
      const albums = artists[0].children;
      const tracks = albums[0].children;
      assert.equal(artists.length, 1);
      assert.equal(albums.length, 1);
      assert.equal(tracks.length, 1);
      assert.equal(tracks[0].media, null);
    });

    it("should GET / with no artist federated and 2 artist deleted", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
        federatedStreaming: false,
        federatedStreamingOptInDate: new Date(Date.now()),
        federatedStreamingOptOutDate: new Date(Date.now()),
      });
      const artist = await createArtist(user.id, {
        name: "deleted-artist",
        urlSlug: "deleted-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: new Date(Date.now()),
      });
      await prisma.profile.update({
        where: { id: artist.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 0);
      assert.equal(response.body.deleted.length, 2);
    });

    it("should GET / with 1 artist federated but no music", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: new Date(Date.now()),
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 0);
      assert.equal(response.body.deleted.length, 0);
    });

    it("should GET / with 1 artist federated and 1 track and trackgroup deleted", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: new Date(Date.now()),
      });
      const trackGroup = await createTrackGroup(artist.id);
      await prisma.trackGroup.update({
        where: { id: trackGroup.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 0);
      assert.equal(response.body.deleted.length, 1);
    });

    it("should GET / with fromDate filter with 1 artist and 1 deleted artist ", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const dateNow = new Date(Date.now());
      await createFederatedArtistWithMusic(user.id);
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "deleted-test-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: dateNow,
      });
      await prisma.profile.update({
        where: { id: artist.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(baseURL)
        .get("sm/canimus.json?" + String(dateNow).split("T")[0])
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 1);
      assert.equal(response.body.deleted.length, 1);
    });

    it("should not let a fromDate request change later requests", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      await createFederatedArtistWithMusic(user.id);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const filtered = await request(baseURL)
        .get(`sm/canimus.json?fromDate=${tomorrow.toISOString()}`)
        .set("Accept", "application/json");
      assert.equal(filtered.body.children.length, 0);

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 1);
    });
  });

  describe("full catalogue clients", () => {
    const apiKey = "mirlomobile";

    beforeEach(async () => {
      const client = await createClient(apiKey);
      await prisma.client.update({
        where: { id: client.id },
        data: { fullCatalog: true },
      });
    });

    it("should list artists who haven't turned on Discovery", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      await createFederatedArtistWithMusic(user.id, {
        federatedStreaming: false,
        federatedStreamingOptInDate: null,
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("mirlo-api-key", apiKey)
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 1);

      const withoutKey = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(withoutKey.body.children.length, 0);
    });

    it("should only list the opt-in feed for a client without fullCatalog", async () => {
      await createClient("fairplayer");
      const { user } = await createUser({
        email: "test@testcom",
      });
      await createFederatedArtistWithMusic(user.id, {
        federatedStreaming: false,
        federatedStreamingOptInDate: null,
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("mirlo-api-key", "fairplayer")
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 0);
    });

    it("should list only real deletions, not opt-outs, as deleted", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      await createFederatedArtistWithMusic(user.id, {
        federatedStreaming: false,
        federatedStreamingOptOutDate: new Date(Date.now()),
      });
      const deletedArtist = await createArtist(user.id, {
        name: "deleted-artist",
        urlSlug: "deleted-artist",
      });
      await prisma.profile.update({
        where: { id: deletedArtist.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("mirlo-api-key", apiKey)
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 1);
      assert.equal(response.body.deleted.length, 1);
      assert.equal(
        response.body.deleted[0].url.includes("deleted-artist"),
        true
      );
    });
  });
});
