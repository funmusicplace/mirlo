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

const createArtistWithMusic = async (federatedStreaming: boolean) => {
  const { user } = await createUser({ email: "test@test.com" });
  const artist = await createArtist(user.id, {
    name: "test-artist",
    urlSlug: "test-artist",
    federatedStreaming,
    federatedStreamingOptInDate: federatedStreaming ? new Date() : null,
  });
  await createTrackGroup(artist.id);
  return artist;
};

describe("artists/{id}/canimus.json", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("returns an artist who turned on Discovery, with their releases", async () => {
    await createArtistWithMusic(true);

    const response = await request(baseURL)
      .get("artists/test-artist/canimus.json")
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.type, "artist");
    assert.equal(response.body.children.length, 1);
    assert.equal(response.body.children[0].children.length, 1);
  });

  it("returns 404 for an artist who hasn't turned on Discovery", async () => {
    await createArtistWithMusic(false);

    const response = await request(baseURL)
      .get("artists/test-artist/canimus.json")
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });

  it("returns an artist who hasn't turned on Discovery to a full catalogue client", async () => {
    const client = await createClient("mirlomobile");
    await prisma.client.update({
      where: { id: client.id },
      data: { fullCatalog: true },
    });
    await createArtistWithMusic(false);

    const response = await request(baseURL)
      .get("artists/test-artist/canimus.json")
      .set("mirlo-api-key", "mirlomobile")
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.children.length, 1);
  });

  it("returns 404 for a disabled artist", async () => {
    const artist = await createArtistWithMusic(true);
    await prisma.profile.update({
      where: { id: artist.id },
      data: { enabled: false },
    });

    const response = await request(baseURL)
      .get(`artists/${artist.id}/canimus.json`)
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });
});
