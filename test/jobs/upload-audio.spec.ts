import assert from "node:assert";
import { Readable } from "node:stream";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import uploadAudio from "../../src/jobs/upload-audio";
import {
  getAudioBucket,
  incomingAudioBucket,
  statFile,
  uploadIncomingAudio,
} from "../../src/utils/minio";
import {
  clearTables,
  createProfile,
  createSilentWavBuffer,
  createTrack,
  createTrackGroup,
  createUser,
  mockJob,
} from "../utils";

describe("upload-audio", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const seedIncomingAudio = async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id);
    const track = await createTrack(trackGroup.id);
    const audio = await prisma.trackAudio.update({
      where: { trackId: track.id },
      data: { fileExtension: "wav", uploadState: "STARTED" },
    });
    await uploadIncomingAudio(
      audio.id,
      Readable.from(createSilentWavBuffer(2))
    );
    return audio;
  };

  const exists = async (bucket: string, key: string) =>
    !!(await statFile(bucket, key)).minioStat;

  it("converts the incoming upload to HLS", async () => {
    const audio = await seedIncomingAudio();

    const result = await uploadAudio(
      mockJob({ audioId: audio.id, fileExtension: "wav" })
    );

    assert.equal(result.error, undefined);
    assert.equal(typeof result.duration, "number");
    assert.equal(
      await exists(getAudioBucket(), `${audio.id}/playlist.m3u8`),
      true
    );
    assert.equal(
      await exists(getAudioBucket(incomingAudioBucket), audio.id),
      false
    );
  });

  it("removes the converted files when the audio was deleted while processing", async () => {
    const audio = await seedIncomingAudio();
    await prisma.trackAudio.delete({ where: { id: audio.id } });

    const result = await uploadAudio(
      mockJob({ audioId: audio.id, fileExtension: "wav" })
    );

    assert.deepEqual(result, { deleted: true });
    assert.equal(
      await exists(getAudioBucket(), `${audio.id}/playlist.m3u8`),
      false
    );
    assert.equal(
      await exists(getAudioBucket(), `${audio.id}/segment-000.ts`),
      false
    );
    assert.equal(
      await exists(getAudioBucket(incomingAudioBucket), audio.id),
      false
    );
  });
});
