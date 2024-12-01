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

describe("manage/posts/{postId}/thumbnail", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should PUT to update the thumbnail of a post", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      const image = await prisma.postImage.create({
        data: {
          postId: post.id,
          mimeType: "image/jpeg",
          extension: "jpg",
        },
      });

      await requestApp
        .put(`manage/posts/${post.id}/thumbnail`)
        .send({
          thumbnailImageId: image.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const updatedPost = await prisma.post.findFirst({
        where: { id: post.id },
      });
      assert.equal(updatedPost?.thumbnailImageId, image.id);
    });
  });
});
