import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET /", async () => {
    const response = await request(baseURL)
      .get("trackGroups")
      .set("Accept", "application/json");

    assert.deepEqual(response.body.results, []);
    assert(response.statusCode === 200);
  });

  it("should GET / with one trackGroup", async () => {
    const { user } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const response = await request(baseURL)
      .get("trackGroups")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, trackGroup.title);
    assert(response.statusCode === 200);
  });

  it("should GET / not get an unpublished", async () => {
    const { user } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, { published: false });
    const response = await request(baseURL)
      .get("trackGroups")
      .set("Accept", "application/json");

    assert.equal(response.body.results, 0);
    assert(response.statusCode === 200);
  });
});
