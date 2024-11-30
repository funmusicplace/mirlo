import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createPost,
  createUser,
} from "../../../utils";

import { requestApp } from "../../utils";
import prisma from "@mirlo/prisma";

describe("manage/posts/{id}/publish", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should PUT to publish a post", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      assert.equal(post.isDraft, true);

      await requestApp
        .put(`manage/posts/${post.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .send({})
        .set("Accept", "application/json");

      const updatedPost = await prisma.post.findFirst({
        where: { id: post.id },
      });
      assert.equal(updatedPost?.isDraft, false);
    });
  });
});
