import { findTrackGroupIdForSlug } from "../../src/utils/trackGroup";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";
import assert from "node:assert";

describe("findTrackGroupIdForSlug", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should find a trackgroup by id", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "test-slug",
    });

    const id = await findTrackGroupIdForSlug(`${trackGroup.id}`);

    assert.equal(id, trackGroup.id);
  });

  it("should find a trackgroup by slug", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "test-slug",
    });

    const id = await findTrackGroupIdForSlug(
      trackGroup.urlSlug,
      `${artist.id}`
    );

    assert.equal(id, trackGroup.id);
  });

  it("should complain about missing artistId", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "test-slug",
    });
    let id;
    try {
      id = await findTrackGroupIdForSlug(trackGroup.urlSlug);
    } catch (e) {
      assert.equal(
        (e as any).message,
        "Searching for a TrackGroup by slug requires an artistId"
      );
    }
    assert.equal(id, undefined);
  });

  it("should handle a urlSlug that is a number if an artistId is defined", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "2121",
    });
    const id = await findTrackGroupIdForSlug(
      trackGroup.urlSlug,
      `${artist.id}`
    );

    assert.equal(id, trackGroup.id);
  });
});
