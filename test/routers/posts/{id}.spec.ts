import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createPost,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "../../../prisma/prisma";
import { randomUUID } from "crypto";
import { faker } from "@faker-js/faker";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

describe("posts/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("posts/1")
        .set("Accept", "application/json");

      assert(response.statusCode === 404);
    });

    it("should GET / 200", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
    });

    it("should GET / and show content if public", async () => {
      const testContent = faker.lorem.paragraph();
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { content: testContent });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.content, testContent);
    });

    it("should GET / send hide content boolean if not public", async () => {
      const testContent = faker.lorem.paragraph();
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, {
        isPublic: false,
        content: testContent,
      });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.content, testContent);
      assert.equal(response.body.result.isContentHidden, true);
    });
  });
});
