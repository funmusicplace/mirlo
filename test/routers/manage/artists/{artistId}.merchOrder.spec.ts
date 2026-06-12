import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createMerch,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("manage/artists/{artistId}/merchOrder", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should PUT / 401 no user", async () => {
    const response = await request(baseURL)
      .put("manage/artists/1/merchOrder")
      .set("Accept", "application/json")
      .send({ merchIds: [] });

    assert.equal(response.statusCode, 401);
  });

  it("should PUT / 404 artist does not belong to user", async () => {
    const { accessToken } = await createUser({
      email: "test@test.com",
    });

    const response = await request(baseURL)
      .put(`manage/artists/1/merchOrder`)
      .send({ merchIds: [] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should PUT successfully on merch belonging to a user's artist", async () => {
    const { user, accessToken } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(user.id);

    const merch1 = await createMerch(artist.id, { title: "Merch 1" });
    const merch2 = await createMerch(artist.id, { title: "Merch 2" });

    const response = await request(baseURL)
      .put(`manage/artists/${artist.id}/merchOrder`)
      .send({ merchIds: [merch2.id, merch1.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const refetchedMerch2 = await prisma.merch.findFirst({
      where: { id: merch2.id },
    });
    const refetchedMerch1 = await prisma.merch.findFirst({
      where: { id: merch1.id },
    });

    assert.equal(refetchedMerch2?.order, 1);
    assert.equal(refetchedMerch1?.order, 2);
  });
});
