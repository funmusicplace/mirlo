import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import request from "supertest";
import { clearTables, createArtist, createUser } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/bulkTrackUpload", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST /", () => {
    it("should return 400 with empty artists", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, "At least one artist is required");
    });

    it("should create a simple track group with one track", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Test Artist",
              trackGroups: [
                {
                  title: "Test Album",
                  tracks: [
                    {
                      title: "Test Track",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.artistsCreated, 1);
      assert.equal(response.body.result.trackGroupsCreated, 1);
      assert.equal(response.body.result.tracksCreated, 1);
      assert.deepEqual(response.body.result.partialErrors, []);

      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          title: "Test Album",
        },
        include: {
          tracks: true,
        },
      });

      assert(trackGroup);
      assert.equal(trackGroup.title, "Test Album");
      assert.equal(trackGroup.tracks.length, 1);
      assert.equal(trackGroup.tracks[0].title, "Test Track");
    });

    it("should create track artist rows for different artist roles", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Main Artist",
              trackGroups: [
                {
                  title: "Album With Roles",
                  tracks: [
                    {
                      title: "Collaborated Track",
                      order: 1,
                      artists: [
                        {
                          artistName: "Composer Name",
                          role: "composer",
                        },
                        {
                          artistName: "Producer Name",
                          role: "producer",
                        },
                        {
                          artistName: "Featured Artist",
                          role: "featured_artist",
                        },
                      ],
                      isrc: "ISRC123456",
                      metadata: { genre: "Electronic" },
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.artistsCreated, 1);
      assert.equal(response.body.result.trackGroupsCreated, 1);
      assert.equal(response.body.result.tracksCreated, 1);

      const track = await prisma.track.findFirst({
        where: {
          title: "Collaborated Track",
        },
        include: {
          trackArtists: true,
        },
      });

      assert(track);
      assert.equal(track.trackArtists.length, 3);
      assert(
        track.trackArtists.some((ta) => ta.artistName === "Composer Name")
      );
      assert(
        track.trackArtists.some((ta) => ta.artistName === "Producer Name")
      );
      assert(
        track.trackArtists.some((ta) => ta.artistName === "Featured Artist")
      );
      assert(track.trackArtists.some((ta) => ta.role === "composer"));
      assert(track.trackArtists.some((ta) => ta.role === "producer"));
      assert(track.trackArtists.some((ta) => ta.role === "featured_artist"));
      assert.equal(track.isrc, "ISRC123456");

      const collaboratorArtists = await prisma.artist.findMany({
        where: {
          name: {
            in: ["Composer Name", "Producer Name", "Featured Artist"],
          },
        },
      });

      assert.equal(collaboratorArtists.length, 0);
    });

    it("should reuse existing artists for the target user", async () => {
      const { accessToken, user } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const existingArtist = await createArtist(user.id, {
        name: "Existing Artist",
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Existing Artist",
              trackGroups: [
                {
                  title: "Album 1",
                  tracks: [
                    {
                      title: "Track 1",
                      order: 1,
                      artists: [
                        {
                          artistName: "Existing Artist",
                          role: "producer",
                        },
                      ],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.artistsCreated, 0);
      assert.equal(response.body.result.trackGroupsCreated, 1);
      assert.equal(response.body.result.tracksCreated, 1);

      const track = await prisma.track.findFirst({
        where: { title: "Track 1" },
        include: { trackArtists: true },
      });

      assert(track);
      assert.equal(track.trackArtists.length, 1);
      assert.equal(track.trackArtists[0].artistId, existingArtist.id);
    });

    it("should create multiple artists and track groups", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Artist A",
              trackGroups: [
                {
                  title: "Album 1",
                  tracks: [
                    {
                      title: "Track 1",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
            {
              name: "Artist B",
              trackGroups: [
                {
                  title: "Album 2",
                  tracks: [
                    {
                      title: "Track 2",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                    {
                      title: "Track 3",
                      order: 2,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.artistsCreated, 2);
      assert.equal(response.body.result.trackGroupsCreated, 2);
      assert.equal(response.body.result.tracksCreated, 3);
    });

    it("should store track metadata and lyrics", async () => {
      const { accessToken } = await createUser({
        email: "manag@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Artist",
              trackGroups: [
                {
                  title: "Album",
                  tracks: [
                    {
                      title: "Track",
                      order: 1,
                      artists: [],
                      lyrics: "Sample lyrics",
                      metadata: {
                        customField1: "value1",
                        customField2: "value2",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const track = await prisma.track.findFirst({
        where: {
          title: "Track",
        },
      });

      assert(track);
      assert.equal(track.lyrics, "Sample lyrics");
      assert.deepEqual(track.metadata, {
        customField1: "value1",
        customField2: "value2",
      });
    });

    it("should generate unique URL slugs per artist", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Artist",
              trackGroups: [
                {
                  title: "My Album",
                  tracks: [
                    {
                      title: "Track 1",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
                {
                  title: "My Album",
                  tracks: [
                    {
                      title: "Track 2",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.trackGroupsCreated, 2);

      const albums = await prisma.trackGroup.findMany({
        where: {
          title: "My Album",
        },
        orderBy: {
          id: "asc",
        },
      });

      assert.equal(albums.length, 2);
      assert.notEqual(albums[0].urlSlug, albums[1].urlSlug);
    });

    it("should continue processing despite one track error", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      // This passes OpenAPI `number` validation but exceeds Postgres Int range.
      const invalidTrack = {
        title: "Invalid Order Track",
        order: 2147483648,
        artists: [],
        metadata: {},
      };

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Artist A",
              trackGroups: [
                {
                  title: "Album 1",
                  tracks: [invalidTrack],
                },
              ],
            },
            {
              name: "Artist B",
              trackGroups: [
                {
                  title: "Album 2",
                  tracks: [
                    {
                      title: "Track 2",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.artistsCreated, 2);
      assert.equal(response.body.result.trackGroupsCreated, 2);
      assert.equal(response.body.result.tracksCreated, 1);
      assert.equal(response.body.result.partialErrors.length, 1);
      assert.match(response.body.result.partialErrors[0], /album "Album 1"/i);
    });

    it("should allow non-admin users to bulk upload their own tracks", async () => {
      const { accessToken, user } = await createUser({
        email: "artist@example.com",
        isAdmin: false,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "My Band",
              trackGroups: [
                {
                  title: "My Album",
                  tracks: [
                    {
                      title: "My Track",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.artistsCreated, 1);
      assert.equal(response.body.result.trackGroupsCreated, 1);
      assert.equal(response.body.result.tracksCreated, 1);

      const createdArtist = await prisma.artist.findFirst({
        where: {
          userId: user.id,
          name: "My Band",
        },
      });

      assert(createdArtist);
      assert.equal(createdArtist.userId, user.id);
    });

    it("should preserve catalogNumber and about fields in track groups", async () => {
      const { accessToken } = await createUser({
        email: "musician@example.com",
        isAdmin: false,
      });

      const response = await requestApp
        .post("manage/bulkTrackUpload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          artists: [
            {
              name: "Recording Artist",
              trackGroups: [
                {
                  title: "Professional Album",
                  about:
                    "This is a professionally recorded album with detailed notes",
                  catalogNumber: "CAT-2024-001",
                  tracks: [
                    {
                      title: "Track One",
                      order: 1,
                      artists: [],
                      metadata: {},
                    },
                    {
                      title: "Track Two",
                      order: 2,
                      artists: [],
                      metadata: {},
                    },
                  ],
                },
              ],
            },
          ],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          title: "Professional Album",
        },
      });

      assert(trackGroup);
      assert.equal(
        trackGroup.about,
        "This is a professionally recorded album with detailed notes"
      );
      assert.equal(trackGroup.catalogNumber, "CAT-2024-001");
    });
  });
});
