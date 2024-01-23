import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "../../../prisma/prisma";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("artists", () => {
  describe("/", () => {
    beforeEach(async () => {
      try {
        await clearTables();
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
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      await createTrack(trackGroup.id);

      const response = await request(baseURL)
        .get("artists/")
        .set("Accept", "application/json");

      assert(response.body.results.length === 1);
    });
  });
});
