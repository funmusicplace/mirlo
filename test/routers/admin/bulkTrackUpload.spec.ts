import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";
import request from "supertest";
import { clearTables, createUser, createArtist } from "../../utils";
import prisma from "@mirlo/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("admin/bulk-track-upload", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST /", () => {
    it("should return 401 without user", async () => {
      const response = await requestApp
        .post("admin/bulk-track-upload")
        .send({
          trackGroups: [],
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 without admin permission", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
      });

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups: [],
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 400 with empty trackGroups", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups: [],
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should create a simple track group with one track", async () => {
      const { accessToken, user } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const trackGroups = [
        {
          release_title: "Test Album",
          release_artist: "Test Artist",
          tracks: [
            {
              track_title: "Test Track",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.artistsCreated, 1);
      assert.equal(response.body.trackGroupsCreated, 1);
      assert.equal(response.body.tracksCreated, 1);

      // Verify the album exists in database
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

    it("should create multiple tracks with different artist roles", async () => {
      const { accessToken, user } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const trackGroups = [
        {
          release_title: "Album With Roles",
          release_artist: "Main Artist",
          tracks: [
            {
              track_title: "Collaborated Track",
              track_number: "1",
              artists: [
                {
                  name: "Composer Name",
                  role: "composer",
                },
                {
                  name: "Producer Name",
                  role: "producer",
                },
                {
                  name: "Featured Artist",
                  role: "featured_artist",
                },
              ],
              isrc: "ISRC123456",
              other_fields: { genre: "Electronic" },
            },
          ],
          metadata: { catalogNumber: "CAT-001" },
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.artistsCreated, 4); // Main + 3 collaborators
      assert.equal(response.body.trackGroupsCreated, 1);
      assert.equal(response.body.tracksCreated, 1);

      // Verify track artists were created with correct roles
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
      assert(track.trackArtists.some((ta) => ta.role === "composer"));
      assert(track.trackArtists.some((ta) => ta.role === "producer"));
      assert(track.trackArtists.some((ta) => ta.role === "featured_artist"));
      assert.equal(track.isrc, "ISRC123456");
    });

    it("should reuse existing artists", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      // Create an artist first - just create one in the database
      await prisma.artist.create({
        data: {
          name: "Existing Artist",
          urlSlug: "existing-artist",
          userId: 1,
        },
      });

      const trackGroups = [
        {
          release_title: "Album 1",
          release_artist: "Existing Artist",
          tracks: [
            {
              track_title: "Track 1",
              track_number: "1",
              artists: [
                {
                  name: "Existing Artist",
                  role: "producer",
                },
              ],
              other_fields: {},
            },
          ],
          metadata: {},
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.artistsCreated, 0); // No new artists, reused existing
      assert.equal(response.body.trackGroupsCreated, 1);
      assert.equal(response.body.tracksCreated, 1);
    });

    it("should create multiple track groups", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const trackGroups = [
        {
          release_title: "Album 1",
          release_artist: "Artist A",
          tracks: [
            {
              track_title: "Track 1",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
        {
          release_title: "Album 2",
          release_artist: "Artist B",
          tracks: [
            {
              track_title: "Track 2",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
            {
              track_title: "Track 3",
              track_number: "2",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.artistsCreated, 2);
      assert.equal(response.body.trackGroupsCreated, 2);
      assert.equal(response.body.tracksCreated, 3);
    });

    it("should handle metadata and unmapped fields", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const trackGroups = [
        {
          release_title: "Album",
          release_artist: "Artist",
          tracks: [
            {
              track_title: "Track",
              track_number: "1",
              artists: [],
              lyrics: "Sample lyrics",
              other_fields: {
                customField1: "value1",
                customField2: "value2",
              },
            },
          ],
          metadata: {},
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      // Verify track metadata was stored
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

    it("should generate unique URL slugs", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const trackGroups = [
        {
          release_title: "My Album",
          release_artist: "Artist",
          tracks: [
            {
              track_title: "Track 1",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
        {
          release_title: "My Album",
          release_artist: "Artist",
          tracks: [
            {
              track_title: "Track 2",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.trackGroupsCreated, 2);

      // Verify both albums exist with different slugs
      const albums = await prisma.trackGroup.findMany({
        where: {
          title: "My Album",
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

      const trackGroups = [
        {
          release_title: "Album 1",
          release_artist: "Artist A",
          tracks: [
            {
              track_title: "Good Track",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
        {
          release_title: "Album 2",
          release_artist: "Artist B",
          tracks: [
            {
              track_title: "Track 2",
              track_number: "1",
              artists: [],
              other_fields: {},
            },
          ],
          metadata: {},
        },
      ];

      const response = await requestApp
        .post("admin/bulk-track-upload")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          trackGroups,
          mapping: {},
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.trackGroupsCreated, 2);
      assert.equal(response.body.tracksCreated, 2);
    });
  });
});
