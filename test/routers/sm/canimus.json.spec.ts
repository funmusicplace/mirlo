import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createArtist,
  createTrack,
  createUser,
  createTrackGroup,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

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
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: new Date(Date.now()),
      });
      const trackGroup = await createTrackGroup(artist.id);
      await createTrack(trackGroup.id);
      const response = await request(baseURL)
        .get("sm/canimus.json")
        .set("Accept", "application/json");
      assert.equal(response.body.children.length, 1);
      assert.equal(response.body.children[0].children.length, 1);
      assert.equal(response.body.deleted.length, 0);
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
      assert.equal(response.body.children.length, 1);
      assert.equal(response.body.deleted.length, 1);
    });

    it("should GET / with fromDate filter with 1 artist and 1 deleted artist ", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const dateNow = new Date(Date.now());
      await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
        federatedStreaming: true,
        federatedStreamingOptInDate: new Date(Date.now() - 1000000),
      });
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
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
  });
});
