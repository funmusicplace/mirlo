import assert from "assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import prisma from "@mirlo/prisma";
import { parseOutIframes } from "../../src/jobs/parse-out-iframes";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

describe("parse-out-iframes", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should replace iframe with trackGroup", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const artist = await createArtist(artistUser.id);
    const trackGroup = await createTrackGroup(artist.id);

    const content = `<iframe src="https://mirlo.space/widget/trackGroup/${trackGroup.id}"></iframe>`;
    const result = await parseOutIframes(content);
    assert(
      result.includes(`<div data-type="trackGroup" data-id="${trackGroup.id}"`)
    );
  });

  it("should replace iframe with track", async () => {
    const content = `<iframe src="https://mirlo.space/widget/track/67890"></iframe>`;
    const result = await parseOutIframes(content);
    assert(result.includes('<div data-type="track" data-id="67890">'));
  });

  it("should not modify content without iframes", async () => {
    const content = `<p>No iframes here!</p>`;
    const result = await parseOutIframes(content);
    assert.equal(result, content);
  });

  describe("fallback URL for unreachable trackGroups (#1703)", () => {
    it("links to the fallback URL when the trackGroup is a draft", async () => {
      const { user: artistUser } = await createUser({
        email: "drafter@artist.com",
      });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id, {
        title: "Draft Album",
        urlSlug: "draft-album",
      });
      await prisma.trackGroup.update({
        where: { id: trackGroup.id },
        data: { isDrafts: true },
      });

      const fallbackUrl = "https://example.test/an-artist/posts/post-slug";
      const content = `<iframe src="https://mirlo.space/widget/trackGroup/${trackGroup.id}"></iframe>`;
      const result = await parseOutIframes(content, fallbackUrl);

      assert(
        result.includes(`href="${fallbackUrl}"`),
        "draft trackGroup link should fall back to the post URL"
      );
      assert(
        !result.includes(`/release/draft-album"`),
        "draft trackGroup release URL should not appear"
      );
    });

    it("still links to the trackGroup when it is published and public", async () => {
      const { user: artistUser } = await createUser({
        email: "publisher@artist.com",
      });
      const artist = await createArtist(artistUser.id, {
        urlSlug: "publisher-artist",
      });
      const trackGroup = await createTrackGroup(artist.id, {
        title: "Public Album",
        urlSlug: "public-album",
      });

      const fallbackUrl = "https://example.test/publisher-artist/posts/p";
      const content = `<iframe src="https://mirlo.space/widget/trackGroup/${trackGroup.id}"></iframe>`;
      const result = await parseOutIframes(content, fallbackUrl);

      assert(
        result.includes(`/publisher-artist/release/public-album`),
        "published trackGroup link should target the album URL"
      );
      assert(
        !result.includes(`href="${fallbackUrl}"`),
        "fallback URL should not be used for a reachable trackGroup"
      );
    });

    it("links to the fallback URL for a track whose album is unreachable", async () => {
      const { user: artistUser } = await createUser({
        email: "drafttrack@artist.com",
      });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id, {
        title: "Draft Album with Track",
        urlSlug: "draft-album-with-track",
        tracks: [{ title: "draft track" }],
      });
      await prisma.trackGroup.update({
        where: { id: trackGroup.id },
        data: { isDrafts: true },
      });
      const track = await prisma.track.findFirstOrThrow({
        where: { trackGroupId: trackGroup.id },
      });
      // urlSlug is required for tracks; ensure the lookup works.
      await prisma.track.update({
        where: { id: track.id },
        data: { urlSlug: "draft-track" },
      });

      const fallbackUrl = "https://example.test/an-artist/posts/post";
      const content = `<iframe src="https://mirlo.space/widget/track/${track.id}"></iframe>`;
      const result = await parseOutIframes(content, fallbackUrl);

      assert(
        result.includes(`href="${fallbackUrl}"`),
        "track in draft trackGroup should fall back to the post URL"
      );
    });
  });
});
