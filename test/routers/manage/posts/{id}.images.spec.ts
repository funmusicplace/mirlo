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

// Minimal 1×1 transparent PNG — small enough to be fast but valid enough for sharp
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQ" +
    "AABjkB6QAAAABJRU5ErkJggg==",
  "base64"
);

describe("manage/posts/{postId}/images", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should return 401 without auth", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);

      const response = await requestApp
        .put(`manage/posts/${post.id}/images`)
        .attach("upload", MINIMAL_PNG, {
          filename: "test.png",
          contentType: "image/png",
        });

      assert.equal(response.status, 401);
    });

    it("should upload a post image without Unexpected end of form", async () => {
      // Regression test: the integrateFederation middleware called
      // Readable.toWeb(req) on every non-GET/HEAD request, which put the
      // stream in paused mode and attached backpressure listeners before
      // busboy ever saw it. This caused busboy to receive a truncated
      // stream and throw "Unexpected end of form" for all multipart
      // uploads on non-ActivityPub routes.
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);

      const response = await requestApp
        .put(`manage/posts/${post.id}/images`)
        .attach("upload", MINIMAL_PNG, {
          filename: "test.png",
          contentType: "image/png",
        })
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.notEqual(
        response.body?.error,
        "Unexpected end of form",
        "busboy must be able to parse the multipart body (check Fedify middleware)"
      );
      assert.equal(response.status, 200);
      assert.ok(
        response.body?.result?.jobId,
        "response should include the uploaded image URL"
      );
    });

    it("should return 401 when post does not belong to user", async () => {
      const { user: owner } = await createUser({ email: "owner@test.com" });
      const { accessToken: otherToken } = await createUser({
        email: "other@test.com",
      });
      const artist = await createArtist(owner.id);
      const post = await createPost(artist.id);

      const response = await requestApp
        .put(`manage/posts/${post.id}/images`)
        .attach("upload", MINIMAL_PNG, {
          filename: "test.png",
          contentType: "image/png",
        })
        .set("Cookie", [`jwt=${otherToken}`]);

      assert.equal(response.status, 401);
    });
  });
});
