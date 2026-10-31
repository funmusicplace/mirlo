import assert from "node:assert";
import { Readable } from "node:stream";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  createBucketIfNotExists,
  getAudioBucket,
  uploadAudioHlsFile,
} from "../../../src/utils/minio";
import {
  clearTables,
  createProfile,
  createTrack,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("tracks/{id}/stream/{segment}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should not serve the original master", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id);
    const track = await createTrack(trackGroup.id, { isPreview: true });
    const audio = await prisma.trackAudio.findFirstOrThrow({
      where: { trackId: track.id },
    });

    await createBucketIfNotExists(getAudioBucket());
    await uploadAudioHlsFile(
      audio.id,
      "original.flac",
      Readable.from(Buffer.from("master"))
    );
    await uploadAudioHlsFile(
      audio.id,
      "segment-000.ts",
      Readable.from(Buffer.from("segment"))
    );

    const master = await requestApp.get(
      `tracks/${track.id}/stream/original.flac`
    );
    assert.equal(master.statusCode, 404);
    assert.notEqual(master.text, "master");

    const segment = await requestApp
      .get(`tracks/${track.id}/stream/segment-000.ts`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    assert.equal(segment.statusCode, 200);
    assert.equal(segment.body.toString(), "segment");
  });

  it("should not have a public route for the original audio", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id);
    const track = await createTrack(trackGroup.id, { isPreview: true });
    const audio = await prisma.trackAudio.findFirstOrThrow({
      where: { trackId: track.id },
    });

    const response = await requestApp.get(`tracks/${audio.id}/audio`);
    assert.equal(response.statusCode, 404);
  });
});
