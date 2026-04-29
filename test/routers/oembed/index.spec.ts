import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { getClient } from "../../../src/utils/getClient";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createPost,
  createMerch,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

let applicationUrl: string;
describe("oembed", () => {
  before(async () => {
    applicationUrl = (await getClient()).applicationUrl;
  });
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET /", () => {
    it("should return 400 when url parameter is missing", async () => {
      const response = await requestApp
        .get("oembed/")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal(
        response.body.error[0].message,
        "must have required property 'url'"
      );
    });

    it("should return 400 when format is not json", async () => {
      const url = encodeURIComponent("https://mirlo.test/artist");
      const response = await requestApp
        .get(`oembed/?url=${url}&format=xml`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert(
        response.body.error[0].message.includes(
          "must be equal to one of the allowed values"
        )
      );
    });

    describe("Album oEmbed", () => {
      it("should return oEmbed data for an album", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const trackGroup = await createTrackGroup(artist.id);
        await createTrack(trackGroup.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/release/${trackGroup.urlSlug}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "rich");
        assert.equal(response.body.width, 400);
        assert.equal(response.body.height, 140);
        assert.equal(
          response.body.title,
          `${trackGroup.title} by ${artist.name}`
        );
        assert.equal(response.body.author_name, artist.name);
        assert.equal(
          response.body.author_url,
          `${applicationUrl}/${artist.urlSlug}`
        );
        assert(response.body.html.includes("iframe"));
        assert(response.body.html.includes(trackGroup.id.toString()));
        assert.equal(response.body.cache_age, 86400);
      });

      it("should include thumbnail for album with cover", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const trackGroup = await createTrackGroup(artist.id, {
          cover: {
            create: {
              url: ["https://example.com/cover.jpgx600"],
            },
          },
        });
        await createTrack(trackGroup.id);
        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/release/${trackGroup.urlSlug}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert(response.body.thumbnail_url);
        assert.equal(response.body.thumbnail_width, 300);
        assert.equal(response.body.thumbnail_height, 300);
      });
    });

    describe("Track oEmbed", () => {
      it("should return oEmbed data for a track", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const trackGroup = await createTrackGroup(artist.id);
        const track = await createTrack(trackGroup.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/release/${trackGroup.urlSlug}/tracks/${track.id}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "rich");
        assert.equal(response.body.width, 400);
        assert.equal(response.body.height, 140);
        assert.equal(response.body.title, `${track.title} by ${artist.name}`);
        assert.equal(response.body.author_name, artist.name);
        assert.equal(
          response.body.author_url,
          `${applicationUrl}/${artist.urlSlug}`
        );
        assert(response.body.html.includes("iframe"));
        assert(response.body.html.includes(`track/${track.id}`));
        assert.equal(response.body.cache_age, 86400);
      });

      it("should include thumbnail for track", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const trackGroup = await createTrackGroup(artist.id, {
          cover: {
            create: {
              url: ["https://example.com/cover.jpgx600"],
            },
          },
        });
        const track = await createTrack(trackGroup.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/release/${trackGroup.urlSlug}/tracks/${track.id}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert(response.body.thumbnail_url);
        assert.equal(response.body.thumbnail_width, 300);
        assert.equal(response.body.thumbnail_height, 300);
      });
    });

    describe("Post oEmbed", () => {
      it("should return oEmbed data for a post by ID", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const post = await createPost(artist.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/posts/${post.id}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "rich");
        assert.equal(response.body.width, 400);
        assert.equal(response.body.height, 300);
        assert.equal(response.body.title, post.title);
        assert.equal(response.body.author_name, artist.name);
        assert.equal(
          response.body.author_url,
          `${applicationUrl}/${artist.urlSlug}`
        );
        assert(response.body.html.includes(`/posts/${post.id}`));
        assert.equal(response.body.cache_age, 86400);
      });

      it("should return oEmbed data for a post by slug", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const post = await createPost(artist.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/posts/${post.urlSlug}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "rich");
        assert.equal(response.body.title, post.title);
      });
    });

    describe("Merch oEmbed", () => {
      it("should return oEmbed data for merch by ID", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const merch = await createMerch(artist.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/merch/${merch.id}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "rich");
        assert.equal(response.body.width, 400);
        assert.equal(response.body.height, 300);
        assert.equal(response.body.title, merch.title);
        assert.equal(response.body.author_name, artist.name);
        assert.equal(
          response.body.author_url,
          `${applicationUrl}/${artist.urlSlug}`
        );
        assert(response.body.html.includes(`/merch/${merch.id}`));
        assert.equal(response.body.cache_age, 86400);
      });

      it("should return oEmbed data for merch by slug", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const merch = await createMerch(artist.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/merch/${merch.urlSlug}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "rich");
        assert.equal(response.body.title, merch.title);
      });

      it("should include thumbnail for merch", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const merch = await createMerch(artist.id);

        await prisma.merchImage.create({
          data: {
            merchId: merch.id,
            url: ["https://example.com/merch.jpgx600"],
          },
        });

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/merch/${merch.id}`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert(response.body.thumbnail_url);
        assert.equal(response.body.thumbnail_width, 300);
        assert.equal(response.body.thumbnail_height, 300);
      });
    });

    describe("Artist oEmbed", () => {
      it("should return oEmbed data for an artist", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(`${applicationUrl}/${artist.urlSlug}`);
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.type, "link");
        assert.equal(response.body.width, 400);
        assert.equal(response.body.height, 300);
        assert.equal(response.body.title, artist.name);
        assert.equal(response.body.author_name, artist.name);
        assert.equal(
          response.body.author_url,
          `${applicationUrl}/${artist.urlSlug}`
        );
        assert.equal(response.body.cache_age, 86400);
      });

      it("should include thumbnail for artist", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        await prisma.artistAvatar.create({
          data: {
            artistId: artist.id,
            url: ["https://example.com/avatar.jpgx600"],
          },
        });

        const url = encodeURIComponent(`${applicationUrl}/${artist.urlSlug}`);
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert(response.body.thumbnail_url);
        assert.equal(response.body.thumbnail_width, 300);
        assert.equal(response.body.thumbnail_height, 300);
      });
    });

    describe("Error cases", () => {
      it("should return 404 for non-existent album", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/non-existent`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
        assert.equal(response.body.error, "Content not found");
      });

      it("should return 404 for non-existent track", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);
        const trackGroup = await createTrackGroup(artist.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/${trackGroup.urlSlug}/99999`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
        assert.equal(response.body.error, "Content not found");
      });

      it("should return 404 for non-existent artist", async () => {
        const url = encodeURIComponent(`${applicationUrl}/non-existent-artist`);
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
        assert.equal(response.body.error, "Content not found");
      });

      it("should return 404 for non-existent post", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/posts/99999`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
        assert.equal(response.body.error, "Content not found");
      });

      it("should return 404 for non-existent merch", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(
          `${applicationUrl}/${artist.urlSlug}/merch/00000000-0000-0000-0000-000000000000`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
        assert.equal(response.body.error, "Content not found");
      });

      it("should return 404 for invalid URL pattern", async () => {
        const url = encodeURIComponent(
          `${applicationUrl}/completely/invalid/path`
        );
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
        assert.equal(response.body.error, "Content not found");
      });
    });

    describe("Query parameters", () => {
      it("should accept maxwidth parameter", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(`${applicationUrl}/${artist.urlSlug}`);
        const response = await requestApp
          .get(`oembed/?url=${url}&maxwidth=600`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
      });

      it("should default format to json", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(`${applicationUrl}/${artist.urlSlug}`);
        const response = await requestApp
          .get(`oembed/?url=${url}`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert(response.body);
      });

      it("should accept format=json explicitly", async () => {
        const user = await createUser({ email: "test@test.com" });
        const artist = await createArtist(user.user.id);

        const url = encodeURIComponent(`${applicationUrl}/${artist.urlSlug}`);
        const response = await requestApp
          .get(`oembed/?url=${url}&format=json`)
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert(response.body);
      });
    });
  });
});
