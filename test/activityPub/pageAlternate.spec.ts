import assert from "node:assert";

import * as cheerio from "cheerio";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";
import request from "supertest";

import { findActivityPubAlternate } from "../../src/activityPub/pageAlternate";
import { analyzePathAndGenerateHTML } from "../../src/parseIndex";
import {
  clearTables,
  createArtist,
  createPost,
  createTrackGroup,
  createUser,
} from "../utils";

const apBase = `${process.env.API_DOMAIN}/v1/ap/artists`;

describe("ActivityPub page alternates (#2400)", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setup = async (activityPub = true) => {
    const { user } = await createUser({ email: "artist@example.com" });
    return createArtist(user.id, { urlSlug: "test-artist", activityPub });
  };

  describe("findActivityPubAlternate", () => {
    it("maps an artist page to its actor", async () => {
      await setup();
      assert.equal(
        await findActivityPubAlternate("/test-artist"),
        `${apBase}/test-artist`
      );
    });

    it("returns null when the artist has not enabled ActivityPub", async () => {
      await setup(false);
      assert.equal(await findActivityPubAlternate("/test-artist"), null);
    });

    it("maps a post page by id or slug to its Article", async () => {
      const artist = await setup();
      const post = await createPost(artist.id, {
        urlSlug: "my-post",
        isDraft: false,
      });
      const expected = `${apBase}/test-artist/posts/${post.id}`;
      assert.equal(
        await findActivityPubAlternate(`/test-artist/posts/${post.id}`),
        expected
      );
      assert.equal(
        await findActivityPubAlternate("/test-artist/posts/my-post"),
        expected
      );
    });

    it("returns null for draft and private posts", async () => {
      const artist = await setup();
      const draft = await createPost(artist.id, { isDraft: true });
      const privatePost = await createPost(artist.id, {
        urlSlug: "private",
        isDraft: false,
        isPublic: false,
      });
      assert.equal(
        await findActivityPubAlternate(`/test-artist/posts/${draft.id}`),
        null
      );
      assert.equal(
        await findActivityPubAlternate(`/test-artist/posts/${privatePost.id}`),
        null
      );
    });

    it("maps a release page to its Audio object", async () => {
      const artist = await setup();
      const tg = await createTrackGroup(artist.id, { urlSlug: "my-album" });
      assert.equal(
        await findActivityPubAlternate("/test-artist/release/my-album"),
        `${apBase}/test-artist/releases/${tg.id}`
      );
    });

    it("returns null for scheduled posts and unpublished releases", async () => {
      const artist = await setup();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const scheduled = await createPost(artist.id, {
        isDraft: false,
        publishedAt: nextWeek,
      });
      await createTrackGroup(artist.id, {
        urlSlug: "draft-album",
        publishedAt: null,
      });
      await createTrackGroup(artist.id, {
        urlSlug: "scheduled-album",
        publishedAt: nextWeek,
      });
      assert.equal(
        await findActivityPubAlternate(`/test-artist/posts/${scheduled.id}`),
        null
      );
      assert.equal(
        await findActivityPubAlternate("/test-artist/release/draft-album"),
        null
      );
      assert.equal(
        await findActivityPubAlternate("/test-artist/release/scheduled-album"),
        null
      );
    });

    it("returns null for pages without an AP object", async () => {
      await setup();
      assert.equal(await findActivityPubAlternate("/test-artist/merch"), null);
      assert.equal(await findActivityPubAlternate("/releases"), null);
    });
  });

  it("adds a link rel=alternate tag to the page head", async () => {
    await setup();
    const $ = cheerio.load("<html><head></head></html>");
    await analyzePathAndGenerateHTML("/test-artist", $);
    assert.equal(
      $('link[rel="alternate"][type="application/activity+json"]').attr("href"),
      `${apBase}/test-artist`
    );
  });

  it("leaves the alternate tag out when asked to", async () => {
    await setup();
    const $ = cheerio.load("<html><head></head></html>");
    await analyzePathAndGenerateHTML("/test-artist", $, undefined, {
      activityPubAlternate: false,
    });
    assert.equal(
      $('link[rel="alternate"][type="application/activity+json"]').length,
      0
    );
  });

  it("does not send the alternate tag to Discord's crawler", async () => {
    await setup();
    const discord = await request(process.env.API_DOMAIN)
      .get("/test-artist")
      .set(
        "User-Agent",
        "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
      );
    const browser = await request(process.env.API_DOMAIN).get("/test-artist");
    assert.equal(discord.status, 200);
    assert(!discord.text.includes("application/activity+json"));
    assert(browser.text.includes("application/activity+json"));
  });

  it("redirects AP requests for a page to the AP object", async () => {
    await setup();
    const response = await request(process.env.API_DOMAIN)
      .get("/test-artist")
      .set("Accept", "application/activity+json");
    assert.equal(response.status, 303);
    assert.equal(response.header.location, `${apBase}/test-artist`);
  });

  it("does not serve scheduled posts or unpublished releases as AP objects", async () => {
    const artist = await setup();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const published = await createTrackGroup(artist.id, {
      urlSlug: "published-album",
    });
    const draft = await createTrackGroup(artist.id, {
      urlSlug: "draft-album",
      publishedAt: null,
    });
    const scheduledPost = await createPost(artist.id, {
      isDraft: false,
      publishedAt: nextWeek,
    });

    const get = (path: string) =>
      request(process.env.API_DOMAIN)
        .get(`/v1/ap/artists/test-artist/${path}`)
        .set("Accept", "application/activity+json");

    assert.equal((await get(`releases/${published.id}`)).status, 200);
    assert.notEqual((await get(`releases/${draft.id}`)).status, 200);
    assert.notEqual((await get(`posts/${scheduledPost.id}`)).status, 200);
  });
});
