import assert from "node:assert";

import { Track } from "@mirlo/prisma/client";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { before, describe, it } from "mocha";

import { MIRLO_API_KEY_HEADER } from "../../../src/auth/apiKey";
import socialMusic from "../../../src/utils/socialMusic";
import {
  clearTables,
  createArtist,
  createClient,
  createTrack,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";
dotenv.config();
const jwt_secret = process.env.JWT_SECRET ?? "secretkey";

describe("tracks/{id}/stream/external/", () => {
  const playlistPath = (id: number) =>
    `tracks/${id}/stream/external/playlist.m3u8`;
  const segmentPath = (id: number) =>
    `tracks/${id}/stream/external/segment-000.ts`;
  const apiKey = "fairplayerlovesmirlo";
  let track: Track;

  before(async () => {
    // Minimal initial setup to include one client and one track
    try {
      await clearTables();
      await createClient(apiKey);
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      track = await createTrack(trackGroup.id, {
        title: "test track",
        description: "This is a test description",
      });
    } catch (e) {
      console.error(e);
    }
  });

  describe("playlist.m3u8", () => {
    it("should GET playlist 404 if track does not exist", async () => {
      const response = await requestApp.get(playlistPath(12345));
      assert.equal(response.statusCode, 404);
    });

    it("should GET playlist 401 if not authed", async () => {
      const response = await requestApp.get(playlistPath(track.id));

      assert.equal(response.statusCode, 401);
    });

    it("should GET playlist 200 respond with file and token if authed", async () => {
      const response = await requestApp
        .get(playlistPath(track.id))
        .set(socialMusic.HEADER_USERID, "remoteuser")
        .set(MIRLO_API_KEY_HEADER, apiKey);

      assert.equal(response.statusCode, 200);
      const playToken = response.header[socialMusic.HEADER_PLAYTOKEN];
      assert(playToken);
      const decoded = jwt.verify(playToken, jwt_secret);
      // @ts-ignore
      const { song, userid } = decoded;
      assert.equal(song, track.id.toString());
      assert.equal(userid, "remoteuser");
    });
  });

  describe("segment-nnn.ts", () => {
    it("should GET segment 404 if track does not exist", async () => {
      const response = await requestApp.get(segmentPath(12345));
      assert.equal(response.statusCode, 404);
    });

    it("should GET segment 401 if no playToken", async () => {
      const response = await requestApp.get(segmentPath(track.id));

      assert.equal(response.statusCode, 401);
    });

    it("should GET segment 400 if playToken invalid", async () => {
      const response = await requestApp.get(
        `${segmentPath(track.id)}?userid=remoteuser&playtoken=not-really-a-token`
      );

      assert.equal(response.statusCode, 400);
    });

    it("should GET segment 200 if playToken matches", async () => {
      const playToken = jwt.sign(
        { userid: "remoteuser", song: track.id.toString() },
        jwt_secret
      );

      const response = await requestApp.get(
        `${segmentPath(track.id)}?userid=remoteuser&playtoken=${playToken}`
      );

      assert.equal(response.statusCode, 200);
    });

    it("should GET segment 403 if playToken doesn't match user", async () => {
      const playToken = jwt.sign(
        { userid: "fakeuser", song: track.id.toString() },
        jwt_secret
      );

      const response = await requestApp.get(
        `${segmentPath(track.id)}?userid=remoteuser&playtoken=${playToken}`
      );

      assert.equal(response.statusCode, 403);
    });
  });
});
