import assert from "node:assert";
import { Readable } from "node:stream";

import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  clearTrackDownloads,
  clearTrackGroupDownloads,
} from "../../src/utils/downloadCache";
import { uploadZip, zipExists } from "../../src/utils/minio";
import {
  clearTables,
  createProfile,
  createTrack,
  createTrackGroup,
  createUser,
} from "../utils";

const fakeZip = () => Readable.from([Buffer.from("not really a zip")]);

const setup = async () => {
  const { user } = await createUser({ email: "artist@artist.com" });
  const profile = await createProfile(user.id);
  const trackGroup = await createTrackGroup(profile.id, { urlSlug: "one" });
  const track = await createTrack(trackGroup.id);
  const otherTrackGroup = await createTrackGroup(profile.id, {
    urlSlug: "two",
  });

  await uploadZip("trackGroup", trackGroup.id, "320.mp3", fakeZip());
  await uploadZip("trackGroup", trackGroup.id, "flac", fakeZip());
  await uploadZip("track", track.id, "320.mp3", fakeZip());
  await uploadZip("trackGroup", otherTrackGroup.id, "320.mp3", fakeZip());

  return { trackGroup, track, otherTrackGroup };
};

describe("downloadCache (#1606)", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("clearTrackGroupDownloads removes every format of the album and its track zips", async () => {
    const { trackGroup, track, otherTrackGroup } = await setup();

    await clearTrackGroupDownloads(trackGroup.id);

    assert.equal(
      await zipExists("trackGroup", trackGroup.id, "320.mp3"),
      false
    );
    assert.equal(await zipExists("trackGroup", trackGroup.id, "flac"), false);
    assert.equal(await zipExists("track", track.id, "320.mp3"), false);
    assert.equal(
      await zipExists("trackGroup", otherTrackGroup.id, "320.mp3"),
      true
    );
  });

  it("clearTrackDownloads removes the track's zip and its album's zip", async () => {
    const { trackGroup, track, otherTrackGroup } = await setup();

    await clearTrackDownloads(track.id);

    assert.equal(await zipExists("track", track.id, "320.mp3"), false);
    assert.equal(
      await zipExists("trackGroup", trackGroup.id, "320.mp3"),
      false
    );
    assert.equal(
      await zipExists("trackGroup", otherTrackGroup.id, "320.mp3"),
      true
    );
  });
});
