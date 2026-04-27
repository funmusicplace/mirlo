import assert from "assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

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
});
