import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "../../prisma/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("artists", () => {
  beforeEach(async () => {
    try {
      await prisma.$executeRaw`DELETE FROM "Artist";`;
      await prisma.$executeRaw`DELETE FROM "User";`;
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / with no artists in database", async () => {
    const response = await request(baseURL)
      .get("artists/")
      .set("Accept", "application/json");

    assert(response.body.results.length === 0);
  });

  it("should GET / with 1 artist in the database", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
      },
    });
    const response = await request(baseURL)
      .get("artists/")
      .set("Accept", "application/json");

    assert(response.body.results.length === 1);
  });
});
