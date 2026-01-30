import assert from "node:assert";
import * as dotenv from "dotenv";
import { describe, it, beforeEach, afterEach } from "mocha";
import * as cheerio from "cheerio";
import * as sinon from "sinon";
import * as fs from "fs";

dotenv.config();

import {
  analyzePathAndGenerateHTML,
  getTrackGroupWidget,
  getTrackWidget,
} from "../src/parseIndex";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
  createTrack,
  createPost,
  createMerch,
  createSiteSettings,
} from "./utils";

describe("analyzePathAndGenerateHTML", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("determineType", () => {
    it("should set og:type to 'music.album' for album releases", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
      });
      await createTrackGroup(artist.id, {
        title: "Test Album",
        urlSlug: "test-album",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/release/test-album", $);

      const ogType = $('meta[property="og:type"]').attr("content");
      assert.equal(ogType, "music.album");
    });

    it("should set og:type to 'music.song' for individual tracks", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "test-artist",
        urlSlug: "test-artist",
      });
      const trackGroup = await createTrackGroup(artist.id, {
        title: "Test Album",
        urlSlug: "test-album",
      });
      const track = await createTrack(trackGroup.id, { title: "Test Track" });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML(
        `/test-artist/release/test-album/tracks/${track.id}`,
        $
      );

      const ogType = $('meta[property="og:type"]').attr("content");
      assert.equal(ogType, "music.song");
    });

    it("should set og:type to 'article' for non-music content", async () => {
      const $ = cheerio.load("<html><title></title></html>");
      await analyzePathAndGenerateHTML("/", $);

      const ogType = $('meta[property="og:type"]').attr("content");
      assert.equal(ogType, "article");
    });
  });

  describe("getTrackGroupWidget", () => {
    it("should generate correct widget URL for track group", () => {
      const mockClient = { applicationUrl: "http://localhost:3000" };
      const result = getTrackGroupWidget(mockClient as any, 123);
      assert.equal(result, "http://localhost:3000/widget/trackGroup/123");
    });

    it("should work with different track group IDs", () => {
      const mockClient = { applicationUrl: "http://localhost:3000" };
      const result1 = getTrackGroupWidget(mockClient as any, 1);
      const result2 = getTrackGroupWidget(mockClient as any, 999);
      assert.equal(result1, "http://localhost:3000/widget/trackGroup/1");
      assert.equal(result2, "http://localhost:3000/widget/trackGroup/999");
    });
  });

  describe("getTrackWidget", () => {
    it("should generate correct widget URL for track", () => {
      const mockClient = { applicationUrl: "http://localhost:3000" };
      const result = getTrackWidget(mockClient as any, 456);
      assert.equal(result, "http://localhost:3000/widget/track/456");
    });

    it("should work with different track IDs", () => {
      const mockClient = { applicationUrl: "http://localhost:3000" };
      const result1 = getTrackWidget(mockClient as any, 1);
      const result2 = getTrackWidget(mockClient as any, 500);
      assert.equal(result1, "http://localhost:3000/widget/track/1");
      assert.equal(result2, "http://localhost:3000/widget/track/500");
    });
  });

  describe("parseIndex route handling", () => {
    it("should handle /releases route with correct title and RSS", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/releases", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Mirlo Releases");

      const rssLink = $('link[type="application/rss+xml"]').attr("href");
      assert(
        rssLink?.includes("trackGroups") && rssLink?.includes("format=rss")
      );
    });

    it("should handle artist profile route with artist name", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "My Artist");
    });

    it("should handle artist/releases route with correct title", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/releases", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert(ogTitle?.includes("My Artist"));
      assert(ogTitle?.includes("releases"));
    });

    it("should handle artist/posts route listing all posts", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/posts", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert(ogTitle?.includes("My Artist"));

      const rssLink = $('link[type="application/rss+xml"]').attr("href");
      assert(rssLink?.includes("feed"));
    });

    it("should handle artist/posts/{slug} route with post slug lookup", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const post = await createPost(artist.id, {
        title: "My Post Title",
        urlSlug: "my-post-slug",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/posts/my-post-slug", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "My Post Title");
    });

    it("should handle artist/merch route listing merch", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/merch", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert(ogTitle?.includes("merch"));
      assert(ogTitle?.includes("My Artist"));
    });

    it("should handle artist/merch/{slug} route with merch title and image", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const merch = await createMerch(artist.id, { title: "Cool T-Shirt" });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML(
        `/test-artist/merch/${merch.urlSlug}`,
        $
      );

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Cool T-Shirt");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("My Artist"));
    });

    it("should handle artist/support route", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/support", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert(ogTitle?.includes("My Artist"));
      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("Support My Artist"));
    });

    it("should handle artist/release/{slug} route with album title", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      await createTrackGroup(artist.id, {
        title: "My Album",
        urlSlug: "test-album",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/release/test-album", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "My Album");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("My Artist"));
    });

    it("should handle artist/release/{slug}/tracks/{id} route with track details", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const trackGroup = await createTrackGroup(artist.id, {
        title: "My Album",
        urlSlug: "test-album",
      });
      const track = await createTrack(trackGroup.id, { title: "Cool Song" });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML(
        `/test-artist/release/test-album/tracks/${track.id}`,
        $
      );

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Cool Song");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("My Artist"));
    });

    it("should handle /login route", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/login", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Log in to Mirlo");
    });

    it("should handle /signup route", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/signup", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Sign up to Mirlo");
    });

    it("should handle /widget route without metadata", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/widget/trackGroup/123", $);
      assert($);
      // Widget routes don't add custom metadata
    });

    it("should handle unknown routes with default Mirlo tags", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/unknown/route", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Mirlo");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert.equal(ogDesc, "Buy and sell music directly from musicians.");
    });
  });

  describe("route handling", () => {
    it("should handle artist/posts route listing all posts", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/posts", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert(ogTitle?.includes("My Artist"));

      const rssLink = $('link[type="application/rss+xml"]').attr("href");
      assert(rssLink?.includes("feed"));
    });

    it("should handle artist/posts/{slug} route with post slug lookup", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const post = await createPost(artist.id, {
        title: "My Post Title",
        urlSlug: "my-post-slug",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/posts/my-post-slug", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "My Post Title");
    });

    it("should handle artist/merch route listing merch", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/merch", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert(ogTitle?.includes("merch"));
      assert(ogTitle?.includes("My Artist"));
    });

    it("should handle artist/merch/{slug} route with merch title and image", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const merch = await createMerch(artist.id, { title: "Cool T-Shirt" });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML(
        `/test-artist/merch/${merch.urlSlug}`,
        $
      );

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Cool T-Shirt");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("My Artist"));
    });

    it("should handle artist/release/{slug} route with album title and release date", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      await createTrackGroup(artist.id, {
        title: "My Album",
        urlSlug: "test-album",
      });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/test-artist/release/test-album", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "My Album");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("My Artist"));
    });

    it("should handle artist/release/{slug}/tracks/{id} route with track details", async () => {
      const { user } = await createUser({ email: "artist@example.com" });
      const artist = await createArtist(user.id, {
        name: "My Artist",
        urlSlug: "test-artist",
      });
      const trackGroup = await createTrackGroup(artist.id, {
        title: "My Album",
        urlSlug: "test-album",
      });
      const track = await createTrack(trackGroup.id, { title: "Cool Song" });

      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML(
        `/test-artist/release/test-album/tracks/${track.id}`,
        $
      );
      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Cool Song");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert(ogDesc?.includes("My Artist"));
    });

    it("should handle /login route", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/login", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Log in to Mirlo");
    });

    it("should handle /signup route", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/signup", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Sign up to Mirlo");
    });

    it("should handle /widget route without metadata", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/widget/trackGroup/123", $);
      // Widget routes don't add custom metadata
    });

    it("should handle unknown routes with default Mirlo tags", async () => {
      const $ = cheerio.load("<html></html>");
      await analyzePathAndGenerateHTML("/unknown/route", $);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      assert.equal(ogTitle, "Mirlo");

      const ogDesc = $('meta[property="og:description"]').attr("content");
      assert.equal(ogDesc, "Buy and sell music directly from musicians.");
    });
  });

  describe("instance colors from site settings", () => {
    it("should inject instance colors from site settings as CSS variables", async () => {
      await createSiteSettings({
        instanceColors: {
          primary: "#ff0000",
          secondary: "#00ff00",
          background: "#0000ff",
          foreground: "#ffff00",
        },
      });

      const $ = cheerio.load("<html><title></title></html>");
      await analyzePathAndGenerateHTML("/", $);

      const styleTag = $("style").first().html();
      assert(styleTag?.includes("--mi-instance-primary-color"));
      assert(styleTag?.includes("--mi-instance-secondary-color"));
      assert(styleTag?.includes("--mi-instance-background-color"));
      assert(styleTag?.includes("--mi-instance-foreground-color"));
    });

    it("should use default colors when site settings are not configured", async () => {
      // Ensure no custom settings exist
      await clearTables();

      const $ = cheerio.load("<html><title></title></html>");
      await analyzePathAndGenerateHTML("/", $);

      const styleTag = $("style").first().html();
      assert(styleTag?.includes("#be3455")); // default primary
      assert(styleTag?.includes("#ffffff")); // default secondary and background
      assert(styleTag?.includes("#000000")); // default foreground
    });

    it("should apply partial instance colors from settings", async () => {
      await createSiteSettings({
        instanceColors: {
          primary: "#123456",
        },
      });

      const $ = cheerio.load("<html><title></title></html>");
      await analyzePathAndGenerateHTML("/", $);

      const styleTag = $("style").first().html();
      assert(styleTag?.includes("--mi-instance-primary-color"));
      // Other colors should use defaults or what's in settings
      assert(styleTag?.includes("--mi-instance-secondary-color"));
    });
  });
});
