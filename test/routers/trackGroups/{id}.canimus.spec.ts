import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createArtist,
  createClient,
  createTrackGroup,
  createUser,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const createRelease = async (federatedStreaming: boolean) => {
  const { user } = await createUser({ email: "test@test.com" });
  const artist = await createArtist(user.id, {
    name: "test-artist",
    urlSlug: "test-artist",
    federatedStreaming,
    federatedStreamingOptInDate: federatedStreaming ? new Date() : null,
  });
  return createTrackGroup(artist.id);
};

describe("trackGroups/{id}/canimus.json", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("returns a release by an artist who turned on Discovery, with its tracks", async () => {
    const trackGroup = await createRelease(true);

    const response = await request(baseURL)
      .get(`trackGroups/${trackGroup.id}/canimus.json`)
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.type, "album");
    assert.equal(response.body.artist, "test-artist");
    assert.equal(response.body.children.length, 1);
  });

  it("finds a release by its slug and artistId", async () => {
    const trackGroup = await createRelease(true);

    const response = await request(baseURL)
      .get(
        `trackGroups/${trackGroup.urlSlug}/canimus.json?artistId=test-artist`
      )
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.uid, String(trackGroup.id));
  });

  it("returns 400 for a slug without an artistId", async () => {
    const trackGroup = await createRelease(true);

    const response = await request(baseURL)
      .get(`trackGroups/${trackGroup.urlSlug}/canimus.json`)
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
  });

  it("returns 404 for a release by an artist who hasn't turned on Discovery", async () => {
    const trackGroup = await createRelease(false);

    const response = await request(baseURL)
      .get(`trackGroups/${trackGroup.id}/canimus.json`)
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });

  it("returns that release to a full catalogue client", async () => {
    const client = await createClient("mirlomobile");
    await prisma.client.update({
      where: { id: client.id },
      data: { fullCatalog: true },
    });
    const trackGroup = await createRelease(false);

    const response = await request(baseURL)
      .get(`trackGroups/${trackGroup.id}/canimus.json`)
      .set("mirlo-api-key", "mirlomobile")
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.children.length, 1);
  });

  it("returns 404 for an unpublished release", async () => {
    const trackGroup = await createRelease(true);
    await prisma.trackGroup.update({
      where: { id: trackGroup.id },
      data: { publishedAt: null },
    });

    const response = await request(baseURL)
      .get(`trackGroups/${trackGroup.id}/canimus.json`)
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });
});
