import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";
import { TrackArtistAppearance } from "@mirlo/prisma/client";
import { describe, it, beforeEach } from "mocha";

import {
  clearTables,
  createProfile,
  createTrack,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

const setUpTrack = async () => {
  const { user, accessToken } = await createUser({
    email: "artist@artist.com",
  });
  const profile = await createProfile(user.id);
  const trackGroup = await createTrackGroup(profile.id);
  const track = await createTrack(trackGroup.id, { title: "test track" });
  return { track, accessToken };
};

const putTrackArtists = (
  trackId: number,
  accessToken: string,
  trackArtists: Record<string, unknown>[]
) =>
  requestApp
    .put(`manage/tracks/${trackId}/trackArtists`)
    .send({ trackArtists })
    .set("Cookie", [`jwt=${accessToken}`])
    .set("Accept", "application/json");

describe("PUT /manage/tracks/{id}/trackArtists", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const legacyCases: {
    stored: TrackArtistAppearance;
    isCoAuthor: boolean;
    expected: TrackArtistAppearance;
  }[] = [
    { stored: "CREDITS_ONLY", isCoAuthor: true, expected: "FEATURED" },
    { stored: "CREDITS_ONLY", isCoAuthor: false, expected: "CREDITS_ONLY" },
    { stored: "FEATURED", isCoAuthor: true, expected: "FEATURED" },
    { stored: "FEATURED", isCoAuthor: false, expected: "CREDITS_ONLY" },
    { stored: "MAIN", isCoAuthor: true, expected: "MAIN" },
    { stored: "MAIN", isCoAuthor: false, expected: "CREDITS_ONLY" },
  ];

  legacyCases.forEach(({ stored, isCoAuthor, expected }) => {
    it(`turns a stored ${stored} row sent with isCoAuthor ${isCoAuthor} into ${expected}`, async () => {
      const { track, accessToken } = await setUpTrack();
      const row = await prisma.trackArtist.create({
        data: {
          trackId: track.id,
          artistName: "Guest",
          appearsAs: stored,
          isCoAuthor: stored !== "CREDITS_ONLY",
        },
      });

      const response = await putTrackArtists(track.id, accessToken, [
        { id: row.id, artistName: "Guest", isCoAuthor, order: 0 },
      ]);

      assert.equal(response.status, 200);
      const updated = await prisma.trackArtist.findUniqueOrThrow({
        where: { id: row.id },
      });
      assert.equal(updated.appearsAs, expected);
      assert.equal(updated.isCoAuthor, expected !== "CREDITS_ONLY");
    });
  });

  it("prefers appearsAs over isCoAuthor on an existing row", async () => {
    const { track, accessToken } = await setUpTrack();
    const row = await prisma.trackArtist.create({
      data: {
        trackId: track.id,
        artistName: "Guest",
        appearsAs: "FEATURED",
        isCoAuthor: true,
      },
    });

    await putTrackArtists(track.id, accessToken, [
      {
        id: row.id,
        artistName: "Guest",
        appearsAs: "MAIN",
        isCoAuthor: false,
        order: 0,
      },
    ]);

    const updated = await prisma.trackArtist.findUniqueOrThrow({
      where: { id: row.id },
    });
    assert.equal(updated.appearsAs, "MAIN");
    assert.equal(updated.isCoAuthor, true);
  });

  it("applies a toggled isCoAuthor when the stored appearsAs is echoed back", async () => {
    const { track, accessToken } = await setUpTrack();
    const row = await prisma.trackArtist.create({
      data: {
        trackId: track.id,
        artistName: "Guest",
        appearsAs: "FEATURED",
        isCoAuthor: true,
      },
    });

    await putTrackArtists(track.id, accessToken, [
      {
        id: row.id,
        artistName: "Guest",
        appearsAs: "FEATURED",
        isCoAuthor: false,
        order: 0,
      },
    ]);

    const updated = await prisma.trackArtist.findUniqueOrThrow({
      where: { id: row.id },
    });
    assert.equal(updated.appearsAs, "CREDITS_ONLY");
    assert.equal(updated.isCoAuthor, false);
  });

  it("applies a changed appearsAs when the stored isCoAuthor is echoed back", async () => {
    const { track, accessToken } = await setUpTrack();
    const row = await prisma.trackArtist.create({
      data: {
        trackId: track.id,
        artistName: "Guest",
        appearsAs: "FEATURED",
        isCoAuthor: true,
      },
    });

    await putTrackArtists(track.id, accessToken, [
      {
        id: row.id,
        artistName: "Guest",
        appearsAs: "CREDITS_ONLY",
        isCoAuthor: true,
        order: 0,
      },
    ]);

    const updated = await prisma.trackArtist.findUniqueOrThrow({
      where: { id: row.id },
    });
    assert.equal(updated.appearsAs, "CREDITS_ONLY");
    assert.equal(updated.isCoAuthor, false);
  });

  it("leaves a migrated self credit alone when its isCoAuthor is echoed back", async () => {
    const { track, accessToken } = await setUpTrack();
    const row = await prisma.trackArtist.create({
      data: {
        trackId: track.id,
        artistName: "Old Name",
        appearsAs: "CREDITS_ONLY",
        isCoAuthor: true,
      },
    });

    await putTrackArtists(track.id, accessToken, [
      { id: row.id, artistName: "Old Name", isCoAuthor: true, order: 0 },
    ]);

    const updated = await prisma.trackArtist.findUniqueOrThrow({
      where: { id: row.id },
    });
    assert.equal(updated.appearsAs, "CREDITS_ONLY");
    assert.equal(updated.isCoAuthor, true);
  });

  it("applies a toggled isCoAuthor through PUT manage/tracks/{id}", async () => {
    const { track, accessToken } = await setUpTrack();
    const row = await prisma.trackArtist.create({
      data: {
        trackId: track.id,
        artistName: "Guest",
        appearsAs: "CREDITS_ONLY",
        isCoAuthor: false,
      },
    });

    const response = await requestApp
      .put(`manage/tracks/${track.id}`)
      .send({
        title: "test track",
        trackArtists: [
          {
            id: row.id,
            artistName: "Guest",
            appearsAs: "CREDITS_ONLY",
            isCoAuthor: true,
            order: 0,
          },
        ],
      })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const updated = await prisma.trackArtist.findUniqueOrThrow({
      where: { id: row.id },
    });
    assert.equal(updated.appearsAs, "FEATURED");
    assert.equal(updated.isCoAuthor, true);
  });

  it("keeps the stored appearance when neither field is sent", async () => {
    const { track, accessToken } = await setUpTrack();
    const row = await prisma.trackArtist.create({
      data: {
        trackId: track.id,
        artistName: "Guest",
        appearsAs: "MAIN",
        isCoAuthor: true,
      },
    });

    await putTrackArtists(track.id, accessToken, [
      { id: row.id, artistName: "Renamed", order: 0 },
    ]);

    const updated = await prisma.trackArtist.findUniqueOrThrow({
      where: { id: row.id },
    });
    assert.equal(updated.artistName, "Renamed");
    assert.equal(updated.appearsAs, "MAIN");
    assert.equal(updated.isCoAuthor, true);
  });

  it("creates a new row sent with isCoAuthor true as FEATURED", async () => {
    const { track, accessToken } = await setUpTrack();

    await putTrackArtists(track.id, accessToken, [
      { artistName: "Guest", isCoAuthor: true, order: 0 },
    ]);

    const created = await prisma.trackArtist.findFirstOrThrow({
      where: { trackId: track.id },
    });
    assert.equal(created.appearsAs, "FEATURED");
    assert.equal(created.isCoAuthor, true);
  });
});
