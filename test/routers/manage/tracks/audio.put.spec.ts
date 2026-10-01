import { promises as fsPromises } from "fs";
import assert from "node:assert";
import os from "os";
import path from "path";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import request from "supertest";

import {
  BucketConfig,
  downloadIncomingAudio,
  setBucketConfig,
} from "../../../../src/utils/minio";
import { getSiteSettings } from "../../../../src/utils/settings";
import {
  clearTables,
  createArtist,
  createSilentWavBuffer,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/tracks/{trackId}/audio PUT", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should store the uploaded file as incoming audio and queue processing", async () => {
    const { user, accessToken } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, { tracks: [] });

    const createResponse = await requestApp
      .post("manage/tracks")
      .send({
        trackGroupId: trackGroup.id,
        title: "Fallback Track",
        filename: "fallback.wav",
      })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");
    assert.equal(createResponse.status, 200);
    const trackId = createResponse.body.result.id;

    const wav = createSilentWavBuffer();
    const response = await requestApp
      .put(`manage/tracks/${trackId}/audio`)
      .attach("upload", wav, "fallback.wav")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.ok(response.body.result.jobId);

    const audio = await prisma.trackAudio.findFirst({ where: { trackId } });
    assert.ok(audio);
    assert.equal(audio.uploadState, "STARTED");
    assert.equal(audio.fileExtension, "wav");

    // Read from whichever bucket layout the API booted with.
    const settings = await getSiteSettings();
    setBucketConfig((settings.bucketNames as BucketConfig | null) ?? null);

    const destPath = path.join(os.tmpdir(), `audio-put-${audio.id}.wav`);
    try {
      await downloadIncomingAudio(audio.id, destPath);
      const stored = await fsPromises.readFile(destPath);
      assert.ok(stored.equals(wav));
    } finally {
      setBucketConfig(null);
      await fsPromises.rm(destPath, { force: true });
    }
  });
});
