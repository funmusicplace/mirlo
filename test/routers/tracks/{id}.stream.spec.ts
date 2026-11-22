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
} from "../../../src/utils/storage";
import {
  clearTables,
  createClient,
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

  describe("who may fetch the playlist", () => {
    const setup = async () => {
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
        "playlist.m3u8",
        Readable.from(Buffer.from("#EXTM3U"))
      );
      return `tracks/${track.id}/stream/playlist.m3u8`;
    };

    it("serves Mirlo's own pages and browsers without Sec-Fetch-Site", async () => {
      const path = await setup();

      for (const site of ["same-origin", "same-site", "none"]) {
        const response = await requestApp.get(path).set("Sec-Fetch-Site", site);
        assert.equal(response.statusCode, 200, site);
      }
      assert.equal((await requestApp.get(path)).statusCode, 200);
    });

    it("serves approved clients on other sites", async () => {
      const path = await setup();
      const client = await createClient("stream-test-key");

      const response = await requestApp
        .get(path)
        .set("Sec-Fetch-Site", "cross-site")
        .set("mirlo-api-key", client.key ?? "");
      assert.equal(response.statusCode, 200);
    });

    it("refuses other sites", async () => {
      const path = await setup();
      await createClient("stream-test-key");

      assert.equal(
        (await requestApp.get(path).set("Sec-Fetch-Site", "cross-site"))
          .statusCode,
        403
      );
      assert.equal(
        (
          await requestApp
            .get(path)
            .set("Sec-Fetch-Site", "cross-site")
            .set("mirlo-api-key", "not-a-key")
        ).statusCode,
        403
      );
    });

    it("limits how many playlists one IP can start", async function () {
      this.timeout(60000);
      const path = await setup();
      const fromIp = (ip: string) =>
        requestApp
          .get(path)
          .set("Sec-Fetch-Site", "same-origin")
          .set("X-Forwarded-For", ip);

      const allowed = await Promise.all(
        Array.from({ length: 100 }, () => fromIp("203.0.113.7"))
      );
      assert.deepEqual(
        allowed.map((r) => r.statusCode),
        Array(100).fill(200)
      );
      assert.equal((await fromIp("203.0.113.7")).statusCode, 429);
      assert.equal((await fromIp("203.0.113.8")).statusCode, 200);
    });
  });
});
