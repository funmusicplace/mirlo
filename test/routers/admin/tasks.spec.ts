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
import prisma from "../../../prisma/prisma";
import { randomUUID } from "crypto";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

describe("admin/tasks", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 401 without user", async () => {
      const response = await requestApp
        .get("admin/tasks")
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });
    it("should GET / 401 without admin", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const response = await requestApp
        .get("admin/tasks")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });

    it("should GET / 200 with admin", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
        isAdmin: true,
      });
      const response = await requestApp
        .get("admin/tasks")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
    });

    it("should GET / run a task", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
        isAdmin: true,
      });
      const response = await requestApp
        .get(
          "admin/tasks?jobName=cleanUpFiles&jobParam=/data/media/downloadCache"
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.cleanUpFiles, "Success");
      assert(response.statusCode === 200);
    });
  });
});
