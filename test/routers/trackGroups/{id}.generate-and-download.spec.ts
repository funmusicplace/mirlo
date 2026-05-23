import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import JSZip from "jszip";
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import generateAlbumJob from "../../../src/jobs/generate-album";
import {
  createBucketIfNotExists,
  finalAudioBucket,
  getBufferFromStorage,
  trackGroupFormatBucket,
} from "../../../src/utils/minio";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
  mockJob,
  seedTrackAudio,
} from "../../utils";
import { requestApp } from "../utils";

describe("trackGroups/{id}: generate-album job + download route", () => {
  beforeEach(async () => {
    try {
      await clearTables();
      await createBucketIfNotExists(finalAudioBucket);
      await createBucketIfNotExists(trackGroupFormatBucket);
    } catch (e) {
      console.error(e);
    }
  });

  it("generates a zip containing the track as a WAV file", async function () {
    this.timeout(30_000);

    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id);
    const tg = await createTrackGroup(artist.id, { tracks: [] });
    const tgWithCover = await prisma.trackGroup.findFirstOrThrow({
      where: { id: tg.id },
      include: { cover: true },
    });
    const track = await createTrack(tg.id, {
      title: "My Test Track",
      order: 1,
    });
    const audio = await seedTrackAudio(track.id);

    await generateAlbumJob(
      mockJob({
        trackGroup: tgWithCover,
        format: "wav",
        tracks: [{ ...track, audio, trackArtists: [] }],
        destinationBucket: trackGroupFormatBucket,
      })
    );

    const { buffer } = await getBufferFromStorage(
      trackGroupFormatBucket,
      `${tg.id}/wav.zip`
    );
    assert(buffer, "Zip should have been written to storage");

    const zip = await JSZip.loadAsync(buffer);
    const audioFiles = Object.keys(zip.files).filter(
      (f) => !zip.files[f].dir && f.endsWith(".wav")
    );

    assert.equal(audioFiles.length, 1, "Zip should contain one WAV file");
    assert(
      audioFiles[0].includes("My Test Track"),
      `File name should include the track title, got: ${audioFiles[0]}`
    );
  });

  it("zip contains one file per track", async function () {
    this.timeout(30_000);

    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id);
    const tg = await createTrackGroup(artist.id, { tracks: [] });
    const tgWithCover = await prisma.trackGroup.findFirstOrThrow({
      where: { id: tg.id },
      include: { cover: true },
    });

    const tracks = [];
    for (const title of ["First Track", "Second Track"]) {
      const track = await createTrack(tg.id, {
        title,
        order: tracks.length + 1,
      });
      const audio = await seedTrackAudio(track.id);
      tracks.push({ ...track, audio, trackArtists: [] });
    }

    await generateAlbumJob(
      mockJob({
        trackGroup: tgWithCover,
        format: "wav",
        tracks,
        destinationBucket: trackGroupFormatBucket,
      })
    );

    const { buffer } = await getBufferFromStorage(
      trackGroupFormatBucket,
      `${tg.id}/wav.zip`
    );
    assert(buffer, "Zip should have been written to storage");
    const zip = await JSZip.loadAsync(buffer);
    const audioFiles = Object.keys(zip.files).filter(
      (f) => !zip.files[f].dir && f.endsWith(".wav")
    );

    assert.equal(audioFiles.length, 2, "Zip should contain one file per track");
  });

  it("the download route serves the generated zip with correct headers", async function () {
    this.timeout(30_000);

    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id);
    const tg = await createTrackGroup(artist.id, { tracks: [] });
    const tgWithCover = await prisma.trackGroup.findFirstOrThrow({
      where: { id: tg.id },
      include: { cover: true },
    });
    const track = await createTrack(tg.id, {
      title: "Download Track",
      order: 1,
    });
    const audio = await seedTrackAudio(track.id);

    await generateAlbumJob(
      mockJob({
        trackGroup: tgWithCover,
        format: "wav",
        tracks: [{ ...track, audio, trackArtists: [] }],
        destinationBucket: trackGroupFormatBucket,
      })
    );

    const { user: purchaser, accessToken } = await createUser({
      email: "purchaser@artist.com",
    });
    await createUserTrackGroupPurchase(purchaser.id, tg.id);

    const response = await requestApp
      .get(`trackGroups/${tg.id}/download?format=wav`)
      .set("Cookie", [`jwt=${accessToken}`])
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    assert.equal(response.statusCode, 200);
    assert.equal(response.header["content-type"], "application/zip");
    assert(
      response.header["content-disposition"]?.includes(".zip"),
      `Content-Disposition should reference a zip, got: ${response.header["content-disposition"]}`
    );

    // Verify the response body is a valid non-empty zip
    const zip = await JSZip.loadAsync(response.body as Buffer);
    const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
    assert(files.length > 0, "Downloaded zip should contain files");
  });
});
