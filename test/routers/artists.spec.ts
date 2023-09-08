import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "../../prisma/prisma";
import { deleteUser } from "../../src/utils/user";

// process.env.APP_HOST
const baseURL = `http://api:3000/v1/`;

console.log("base_url", baseURL);
describe("artists", () => {
  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM "Artist";`;
    await prisma.$executeRaw`DELETE FROM "User";`;
  });

  it("should GET / with no artists in database", async () => {
    try {
      const response = await request(baseURL)
        .get("artists/")
        .set("Accept", "application/json");

      assert(response.body.results.length === 0);
    } catch (e) {
      console.error(e);
    }
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
