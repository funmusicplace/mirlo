import assert from "node:assert";

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
      assert.equal(response.body.url, process.env.API_DOMAIN);
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
      console.log(response.body.children);
      assert.equal(response.body.children.length, 1);
      assert.equal(response.body.children[0].children.length, 1);
      assert.equal(response.body.deleted.length, 0);
    });
  });
});
