import assert from "node:assert";
import { createHash } from "node:crypto";

import prisma from "@mirlo/prisma";
import { beforeEach, describe, it } from "mocha";
import request from "supertest";

import { createSubsonicCredential } from "../../src/utils/subsonicCredentials";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
  createUserTrackPurchase,
  seedTrackAudio,
} from "../utils";

const api = request(`${process.env.API_DOMAIN}`);

type Credential = Awaited<ReturnType<typeof createSubsonicCredential>>;

const rest = (method: string) => `/subsonic/rest/${method}.view`;

// An authenticated GET answering in JSON
const call = (
  method: string,
  credential: Credential,
  params: Record<string, string | number> = {}
) =>
  api
    .get(rest(method))
    .query({ u: credential.username, p: credential.password, f: "json" })
    .query(params);

const envelope = (response: request.Response) =>
  response.body["subsonic-response"];

// supertest doesn't collect audio bodies on its own
const withAudioBody = (req: request.Test) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => done(null, Buffer.concat(chunks)));
  });

// Audio comes back as a redirect to storage or, without a public storage
// endpoint as in this test setup, piped through the API
const assertServesAudio = (response: request.Response, message: string) => {
  if (response.status === 302) {
    assert(response.headers.location.includes("original.wav"), message);
  } else {
    assert.equal(response.status, 200, message);
    assert(response.headers["content-type"].startsWith("audio/"), message);
    assert(response.body.length > 0, message);
  }
};

const setup = async () => {
  const { user: buyer } = await createUser({ email: "buyer@test.com" });
  const { user: seller } = await createUser({ email: "seller@test.com" });
  const profile = await createProfile(seller.id, { name: "Test artist" });
  const credential = await createSubsonicCredential(buyer.id);
  return { buyer, seller, profile, credential };
};

const createAlbum = (
  profileId: number,
  title: string,
  trackTitles: string[],
  data?: Parameters<typeof createTrackGroup>[1]
) =>
  createTrackGroup(profileId, {
    title,
    tracks: trackTitles.map((trackTitle, index) => ({
      title: trackTitle,
      order: index + 1,
      audio: { create: { uploadState: "SUCCESS" as const } },
    })),
    ...data,
  });

const tracksOf = (trackGroupId: number) =>
  prisma.track.findMany({ where: { trackGroupId }, orderBy: { order: "asc" } });

describe("subsonic", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("authentication and formats", () => {
    it("fails a ping without credentials", async () => {
      const response = await api.get(rest("ping")).query({ f: "json" });

      assert.equal(response.status, 200);
      assert.equal(envelope(response).status, "failed");
      assert.equal(envelope(response).error.code, 10);
    });

    it("fails a ping with a wrong password", async () => {
      const { credential } = await setup();

      const response = await call("ping", {
        ...credential,
        password: "wrong",
      });

      assert.equal(envelope(response).status, "failed");
      assert.equal(envelope(response).error.code, 40);
    });

    it("answers an authenticated ping", async () => {
      const { credential } = await setup();

      const response = await call("ping", credential);

      assert.equal(response.status, 200);
      assert.equal(envelope(response).status, "ok");
      assert.equal(envelope(response).version, "1.16.1");
      assert.equal(envelope(response).type, "mirlo");
      assert.equal(envelope(response).openSubsonic, true);
    });

    it("answers in XML when no format is given", async () => {
      const { credential } = await setup();

      const response = await api
        .get(rest("ping"))
        .query({ u: credential.username, p: credential.password })
        .buffer(true);

      assert(response.headers["content-type"].includes("xml"));
      assert(
        response.text.includes(
          '<subsonic-response xmlns="http://subsonic.org/restapi" status="ok"'
        )
      );
    });

    it("answers a failed XML ping with an error element", async () => {
      const response = await api.get(rest("ping")).buffer(true);

      assert(response.text.includes('status="failed"'));
      assert(response.text.includes('<error code="10" message="'));
    });

    it("answers in JSONP when a callback is given", async () => {
      const { credential } = await setup();

      const response = await api
        .get(rest("ping"))
        .query({
          u: credential.username,
          p: credential.password,
          f: "jsonp",
          callback: "cb",
        })
        .buffer(true);

      assert(response.headers["content-type"].includes("javascript"));
      assert(response.text.startsWith("cb("));
      assert(response.text.endsWith(");"));
    });

    it("strips unsafe characters from the JSONP callback", async () => {
      const { credential } = await setup();

      const response = await api
        .get(rest("ping"))
        .query({
          u: credential.username,
          p: credential.password,
          f: "jsonp",
          callback: "cb(alert(1));//",
        })
        .buffer(true);

      assert(response.text.startsWith("cbalert1("));
    });

    it("works without the .view suffix", async () => {
      const { credential } = await setup();

      const response = await api
        .get("/subsonic/rest/ping")
        .query({ u: credential.username, p: credential.password, f: "json" });

      assert.equal(envelope(response).status, "ok");
    });

    it("reads parameters from a POST form body", async () => {
      const { credential } = await setup();

      const response = await api
        .post(rest("ping"))
        .type("form")
        .send({ u: credential.username, p: credential.password, f: "json" });

      assert.equal(envelope(response).status, "ok");
    });

    it("accepts a hex encoded password", async () => {
      const { credential } = await setup();

      const response = await api.get(rest("ping")).query({
        u: credential.username,
        p: `enc:${Buffer.from(credential.password).toString("hex")}`,
        f: "json",
      });

      assert.equal(envelope(response).status, "ok");
    });

    it("accepts a salted token", async () => {
      const { credential } = await setup();
      const salt = "c19b2d";
      const token = createHash("md5")
        .update(credential.password + salt)
        .digest("hex");

      const response = await api
        .get(rest("ping"))
        .query({ u: credential.username, t: token, s: salt, f: "json" });

      assert.equal(envelope(response).status, "ok");
    });

    it("authenticates with an API key alone", async () => {
      const { credential } = await setup();

      const response = await api
        .get(rest("getAlbumList2"))
        .query({ apiKey: credential.password, type: "newest", f: "json" });

      assert.equal(envelope(response).status, "ok");
      assert.deepStrictEqual(envelope(response).albumList2.album, []);
    });

    it("rejects an unknown API key", async () => {
      await setup();

      const response = await api
        .get(rest("ping"))
        .query({ apiKey: "not-a-key", f: "json" });

      assert.equal(envelope(response).error.code, 44);
    });
  });

  describe("CORS", () => {
    it("allows any origin", async () => {
      const { credential } = await setup();

      const response = await call("ping", credential).set(
        "Origin",
        "http://example.com"
      );

      assert.equal(response.headers["access-control-allow-origin"], "*");
    });

    it("answers a preflight request", async () => {
      const response = await api
        .options(rest("ping"))
        .set("Origin", "http://example.com")
        .set("Access-Control-Request-Method", "GET");

      assert.equal(response.status, 204);
      assert.equal(response.headers["access-control-allow-origin"], "*");
    });
  });

  describe("getAlbumList2", () => {
    const setupLibrary = async () => {
      const context = await setup();
      const { buyer, profile } = context;
      const alpha = await createAlbum(profile.id, "Alpha", ["A1", "A2"], {
        releaseDate: new Date(Date.UTC(2020, 0, 1, 0, 30)),
      });
      const bravo = await createAlbum(profile.id, "Bravo", ["B1", "B2", "B3"]);
      const charlie = await createAlbum(profile.id, "Charlie", [
        "C1",
        "C2",
        "C3",
      ]);
      const [b1, , b3] = await tracksOf(bravo.id);
      const [c1] = await tracksOf(charlie.id);

      await createUserTrackGroupPurchase(buyer.id, alpha.id, {
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      await createUserTrackPurchase(buyer.id, b1.id, {
        createdAt: new Date("2024-02-01T00:00:00Z"),
      });
      await createUserTrackPurchase(buyer.id, b3.id, {
        createdAt: new Date("2024-03-01T00:00:00Z"),
      });
      await createUserTrackGroupPurchase(buyer.id, charlie.id, {
        createdAt: new Date("2024-01-15T00:00:00Z"),
      });
      await createUserTrackPurchase(buyer.id, c1.id, {
        createdAt: new Date("2024-02-15T00:00:00Z"),
      });
      return { ...context, alpha, bravo, charlie };
    };

    it("groups purchases into one album per release", async () => {
      const { credential } = await setupLibrary();

      const response = await call("getAlbumList2", credential, {
        type: "newest",
      });

      const albums = envelope(response).albumList2.album;
      assert.deepStrictEqual(
        albums.map((album: { name: string }) => album.name),
        ["Bravo", "Charlie", "Alpha"]
      );
      // Bravo holds the two bought tracks, Charlie every track once
      assert.deepStrictEqual(
        albums.map((album: { songCount: number }) => album.songCount),
        [2, 3, 2]
      );
    });

    it("pages with size and offset", async () => {
      const { credential } = await setupLibrary();

      const response = await call("getAlbumList2", credential, {
        type: "newest",
        size: 1,
        offset: 1,
      });

      const albums = envelope(response).albumList2.album;
      assert.equal(albums.length, 1);
      assert.equal(albums[0].name, "Charlie");
    });

    it("sorts alphabetically by name", async () => {
      const { credential } = await setupLibrary();

      const response = await call("getAlbumList2", credential, {
        type: "alphabeticalByName",
      });

      assert.deepStrictEqual(
        envelope(response).albumList2.album.map(
          (album: { name: string }) => album.name
        ),
        ["Alpha", "Bravo", "Charlie"]
      );
    });

    it("filters by year", async () => {
      const { credential, alpha } = await setupLibrary();

      const response = await call("getAlbumList2", credential, {
        type: "byYear",
        fromYear: 2020,
        toYear: 2020,
      });

      assert.deepStrictEqual(
        envelope(response).albumList2.album.map(
          (album: { id: string }) => album.id
        ),
        [`al-${alpha.id}`]
      );
    });

    it("requires a type", async () => {
      const { credential } = await setupLibrary();

      const response = await call("getAlbumList2", credential);

      assert.equal(envelope(response).status, "failed");
      assert.equal(envelope(response).error.code, 10);
    });

    it("reports real durations and the UTC release year", async () => {
      const { credential, alpha } = await setupLibrary();
      const [a1, a2] = await tracksOf(alpha.id);
      await prisma.trackAudio.update({
        where: { trackId: a1.id },
        data: { duration: 100 },
      });
      await prisma.trackAudio.update({
        where: { trackId: a2.id },
        data: { duration: 50 },
      });

      const response = await call("getAlbumList2", credential, {
        type: "alphabeticalByName",
      });

      const [first] = envelope(response).albumList2.album;
      assert.equal(first.name, "Alpha");
      assert.equal(first.duration, 150);
      // 00:30 UTC on New Year's Day is still the previous year in the Americas
      assert.equal(first.year, 2020);
    });

    it("leaves unpublished releases out", async () => {
      const { buyer, profile, credential } = await setup();
      const draft = await createAlbum(profile.id, "Draft", ["D1"], {
        publishedAt: null,
      });
      await createUserTrackGroupPurchase(buyer.id, draft.id);

      const response = await call("getAlbumList2", credential, {
        type: "newest",
      });

      assert.deepStrictEqual(envelope(response).albumList2.album, []);
    });

    it("leaves out other people's purchases", async () => {
      const { profile, credential } = await setup();
      const { user: stranger } = await createUser({ email: "other@test.com" });
      const album = await createAlbum(profile.id, "Theirs", ["T1"]);
      await createUserTrackGroupPurchase(stranger.id, album.id);

      const response = await call("getAlbumList2", credential, {
        type: "newest",
      });

      assert.deepStrictEqual(envelope(response).albumList2.album, []);
    });
  });

  describe("getAlbum", () => {
    it("returns the songs of an owned album", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Alpha", ["A1", "A2"]);
      const tracks = await tracksOf(album.id);
      await prisma.trackAudio.update({
        where: { trackId: tracks[0].id },
        data: { duration: 100, size: 2048, fileExtension: "flac" },
      });
      await createUserTrackGroupPurchase(buyer.id, album.id);

      const response = await call("getAlbum", credential, {
        id: `al-${album.id}`,
      });

      const result = envelope(response).album;
      assert.equal(envelope(response).status, "ok");
      assert.equal(result.id, `al-${album.id}`);
      assert.equal(result.name, "Alpha");
      assert.equal(result.artist, "Test artist");
      assert.equal(result.artistId, `ar-${profile.id}`);
      assert.equal(result.coverArt, `al-${album.id}`);
      assert.equal(result.songCount, 2);
      assert.deepStrictEqual(
        result.song.map((song: { id: string }) => song.id),
        tracks.map((track) => `tr-${track.id}`)
      );
      const [song] = result.song;
      assert.equal(song.parent, `al-${album.id}`);
      assert.equal(song.albumId, `al-${album.id}`);
      assert.equal(song.artistId, `ar-${profile.id}`);
      assert.equal(song.title, "A1");
      assert.equal(song.track, 1);
      assert.equal(song.isDir, false);
      assert.equal(song.type, "music");
      assert.equal(song.duration, 100);
      assert.equal(song.size, 2048);
      assert.equal(song.suffix, "flac");
      assert.equal(song.contentType, "audio/flac");
    });

    it("returns only the bought track of a single-track purchase", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Bravo", ["B1", "B2"]);
      const [, b2] = await tracksOf(album.id);
      await createUserTrackPurchase(buyer.id, b2.id);

      const response = await call("getAlbum", credential, {
        id: `al-${album.id}`,
      });

      assert.deepStrictEqual(
        envelope(response).album.song.map((song: { id: string }) => song.id),
        [`tr-${b2.id}`]
      );
    });

    it("doesn't know an album the user didn't buy", async () => {
      const { profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Unbought", ["U1"]);

      const response = await call("getAlbum", credential, {
        id: `al-${album.id}`,
      });

      assert.equal(envelope(response).status, "failed");
      assert.equal(envelope(response).error.code, 70);
    });

    it("doesn't know a missing or malformed album", async () => {
      const { credential } = await setup();

      for (const id of ["al-999999", "junk", "tr-1"]) {
        const response = await call("getAlbum", credential, { id });
        assert.equal(envelope(response).error.code, 70, id);
      }
    });

    it("requires an id", async () => {
      const { credential } = await setup();

      const response = await call("getAlbum", credential);

      assert.equal(envelope(response).error.code, 10);
    });
  });

  describe("getArtists and getArtist", () => {
    const setupArtists = async () => {
      const context = await setup();
      const { buyer, seller } = context;
      const buy = async (name: string, titles: string[]) => {
        const profile = await createProfile(seller.id, { name });
        for (const title of titles) {
          const album = await createAlbum(profile.id, title, [`${title} 1`]);
          await createUserTrackGroupPurchase(buyer.id, album.id);
        }
        return profile;
      };
      const zeta = await buy("Zeta Band", ["Z one", "Z two"]);
      const alphaDuo = await buy("alpha duo", ["A one"]);
      const numbers = await buy("1990s Kids", ["N one"]);
      return { ...context, zeta, alphaDuo, numbers };
    };

    it("indexes artists by first letter with album counts", async () => {
      const { credential, zeta, alphaDuo, numbers } = await setupArtists();

      const response = await call("getArtists", credential);

      const { artists } = envelope(response);
      assert.equal(artists.ignoredArticles, "");
      assert.deepStrictEqual(
        artists.index.map((index: { name: string }) => index.name),
        ["#", "A", "Z"]
      );
      const [hash, a, z] = artists.index;
      assert.equal(hash.artist[0].id, `ar-${numbers.id}`);
      assert.equal(a.artist[0].id, `ar-${alphaDuo.id}`);
      assert.equal(a.artist[0].name, "alpha duo");
      assert.equal(a.artist[0].albumCount, 1);
      assert.equal(z.artist[0].id, `ar-${zeta.id}`);
      assert.equal(z.artist[0].albumCount, 2);
    });

    it("lists the albums of an artist", async () => {
      const { credential, zeta } = await setupArtists();

      const response = await call("getArtist", credential, {
        id: `ar-${zeta.id}`,
      });

      const { artist } = envelope(response);
      assert.equal(artist.name, "Zeta Band");
      assert.equal(artist.albumCount, 2);
      assert.deepStrictEqual(
        artist.album.map((album: { name: string }) => album.name).sort(),
        ["Z one", "Z two"]
      );
      assert.equal(artist.album[0].artistId, `ar-${zeta.id}`);
    });

    it("doesn't know an artist with nothing bought", async () => {
      const { credential, seller } = await setupArtists();
      const stranger = await createProfile(seller.id, { name: "Stranger" });

      for (const id of [`ar-${stranger.id}`, "ar-999999", "junk"]) {
        const response = await call("getArtist", credential, { id });
        assert.equal(envelope(response).error.code, 70, id);
      }
    });

    it("requires an id", async () => {
      const { credential } = await setupArtists();

      const response = await call("getArtist", credential);

      assert.equal(envelope(response).error.code, 10);
    });
  });

  describe("search3", () => {
    const setupSearch = async () => {
      const context = await setup();
      const { buyer, profile } = context;
      const alpha = await createAlbum(profile.id, "Alpha", [
        "Opening Song",
        "Second Song",
      ]);
      const bravo = await createAlbum(profile.id, "Bravo", ["Third Tune"]);
      await createUserTrackGroupPurchase(buyer.id, alpha.id);
      await createUserTrackGroupPurchase(buyer.id, bravo.id);
      return context;
    };

    it("returns everything for an empty query", async () => {
      const { credential } = await setupSearch();

      for (const query of ["", '""']) {
        const response = await call("search3", credential, { query });
        const result = envelope(response).searchResult3;
        assert.equal(result.artist.length, 1, query);
        assert.equal(result.album.length, 2, query);
        assert.equal(result.song.length, 3, query);
      }
    });

    it("matches song titles case-insensitively", async () => {
      const { credential } = await setupSearch();

      const response = await call("search3", credential, { query: "SECOND" });

      const result = envelope(response).searchResult3;
      assert.deepStrictEqual(
        result.song.map((song: { title: string }) => song.title),
        ["Second Song"]
      );
      assert.equal(result.album.length, 0);
      assert.equal(result.artist.length, 0);
    });

    it("matches the songs of an album by its title", async () => {
      const { credential } = await setupSearch();

      const response = await call("search3", credential, { query: "bravo" });

      const result = envelope(response).searchResult3;
      assert.deepStrictEqual(
        result.album.map((album: { name: string }) => album.name),
        ["Bravo"]
      );
      assert.deepStrictEqual(
        result.song.map((song: { title: string }) => song.title),
        ["Third Tune"]
      );
    });

    it("matches an artist name", async () => {
      const { credential } = await setupSearch();

      const response = await call("search3", credential, {
        query: "test artist",
      });

      const result = envelope(response).searchResult3;
      assert.equal(result.artist.length, 1);
      assert.equal(result.album.length, 2);
      assert.equal(result.song.length, 3);
    });

    it("limits and offsets each kind of result", async () => {
      const { credential } = await setupSearch();

      const limited = await call("search3", credential, {
        query: "",
        songCount: 1,
      });
      assert.equal(envelope(limited).searchResult3.song.length, 1);
      assert.equal(envelope(limited).searchResult3.album.length, 2);

      const offset = await call("search3", credential, {
        query: "",
        albumCount: 1,
        albumOffset: 1,
      });
      assert.equal(envelope(offset).searchResult3.album.length, 1);
    });

    it("requires a query", async () => {
      const { credential } = await setupSearch();

      const response = await call("search3", credential);

      assert.equal(envelope(response).error.code, 10);
    });
  });

  describe("getCoverArt", () => {
    const createCoveredAlbum = (profileId: number) =>
      createAlbum(profileId, "Covered", ["C1"], {
        cover: {
          create: {
            url: ["cover-x600", "cover-x120"],
            dimensions: "artwork",
            profileId,
          },
        },
      });

    it("redirects to the largest cover by default", async () => {
      const { profile, credential } = await setup();
      const album = await createCoveredAlbum(profile.id);

      const response = await call("getCoverArt", credential, {
        id: `al-${album.id}`,
      });

      assert.equal(response.status, 302);
      assert(response.headers.location.includes("cover-x600"));
    });

    it("redirects to the smallest cover that is big enough", async () => {
      const { profile, credential } = await setup();
      const album = await createCoveredAlbum(profile.id);

      const small = await call("getCoverArt", credential, {
        id: `al-${album.id}`,
        size: 100,
      });
      const medium = await call("getCoverArt", credential, {
        id: `al-${album.id}`,
        size: 500,
      });
      const huge = await call("getCoverArt", credential, {
        id: `al-${album.id}`,
        size: 4000,
      });

      assert(small.headers.location.includes("cover-x120"));
      assert(medium.headers.location.includes("cover-x600"));
      assert(huge.headers.location.includes("cover-x600"));
    });

    it("redirects to an artist avatar", async () => {
      const { profile, credential } = await setup();
      const avatar = await prisma.image.create({
        data: {
          url: ["avatar-x600"],
          dimensions: "avatar",
          profileId: profile.id,
        },
      });
      await prisma.profile.update({
        where: { id: profile.id },
        data: { avatarImageId: avatar.id },
      });

      const response = await call("getCoverArt", credential, {
        id: `ar-${profile.id}`,
      });

      assert.equal(response.status, 302);
      assert(response.headers.location.includes("avatar-x600"));
    });

    it("answers 404 for an artist without an avatar", async () => {
      const { profile, credential } = await setup();

      const response = await call("getCoverArt", credential, {
        id: `ar-${profile.id}`,
      });

      assert.equal(response.status, 404);
      assert.equal(envelope(response).error.code, 70);
    });

    it("answers 404 for unknown, malformed and unpublished ids", async () => {
      const { profile, credential } = await setup();
      const draft = await createCoveredAlbum(profile.id);
      await prisma.trackGroup.update({
        where: { id: draft.id },
        data: { publishedAt: null },
      });

      for (const id of ["al-999999", "junk", `al-${draft.id}`]) {
        const response = await call("getCoverArt", credential, { id });
        assert.equal(response.status, 404, id);
        assert.equal(envelope(response).error.code, 70, id);
      }
    });

    it("requires an id", async () => {
      const { credential } = await setup();

      const response = await call("getCoverArt", credential);

      assert.equal(envelope(response).error.code, 10);
    });
  });

  describe("stream and download", () => {
    it("serves the original file of an owned album track", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Alpha", ["A1"]);
      const [track] = await tracksOf(album.id);
      await seedTrackAudio(track.id, "wav");
      await createUserTrackGroupPurchase(buyer.id, album.id);

      for (const method of ["stream", "download"]) {
        const response = await withAudioBody(
          call(method, credential, { id: `tr-${track.id}` })
        );
        assertServesAudio(response, method);
      }
    });

    it("serves the original file of a bought track", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Bravo", ["B1", "B2"]);
      const [b1] = await tracksOf(album.id);
      await seedTrackAudio(b1.id, "wav");
      await createUserTrackPurchase(buyer.id, b1.id);

      const response = await withAudioBody(
        call("stream", credential, { id: `tr-${b1.id}` })
      );

      assertServesAudio(response, "stream");
    });

    it("answers 404 for a track the user doesn't own", async () => {
      const { profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Unbought", ["U1"]);
      const [track] = await tracksOf(album.id);
      await seedTrackAudio(track.id, "wav");

      for (const method of ["stream", "download"]) {
        const response = await call(method, credential, {
          id: `tr-${track.id}`,
        });
        assert.equal(response.status, 404, method);
        assert.equal(envelope(response).error.code, 70, method);
      }
    });

    it("answers 404 for a track from another user's purchase", async () => {
      const { profile, credential } = await setup();
      const { user: stranger } = await createUser({ email: "other@test.com" });
      const album = await createAlbum(profile.id, "Theirs", ["T1"]);
      const [track] = await tracksOf(album.id);
      await seedTrackAudio(track.id, "wav");
      await createUserTrackGroupPurchase(stranger.id, album.id);

      const response = await call("stream", credential, {
        id: `tr-${track.id}`,
      });

      assert.equal(response.status, 404);
      assert.equal(envelope(response).error.code, 70);
    });

    it("answers 404 for audio that hasn't finished processing", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Alpha", ["A1"]);
      const [track] = await tracksOf(album.id);
      await seedTrackAudio(track.id, "wav");
      await prisma.trackAudio.update({
        where: { trackId: track.id },
        data: { uploadState: "STARTED" },
      });
      await createUserTrackGroupPurchase(buyer.id, album.id);

      const response = await call("stream", credential, {
        id: `tr-${track.id}`,
      });

      assert.equal(response.status, 404);
      assert.equal(envelope(response).error.code, 70);
    });

    it("answers 404 for a track without a stored file", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Alpha", ["A1"]);
      const [track] = await tracksOf(album.id);
      await createUserTrackGroupPurchase(buyer.id, album.id);

      const response = await call("stream", credential, {
        id: `tr-${track.id}`,
      });

      assert.equal(response.status, 404);
      assert.equal(envelope(response).error.code, 70);
    });

    it("answers 404 once an admin disables the release", async () => {
      const { buyer, profile, credential } = await setup();
      const album = await createAlbum(profile.id, "Alpha", ["A1"]);
      const [track] = await tracksOf(album.id);
      await seedTrackAudio(track.id, "wav");
      await createUserTrackGroupPurchase(buyer.id, album.id);
      await prisma.trackGroup.update({
        where: { id: album.id },
        data: { adminEnabled: false },
      });

      const response = await call("stream", credential, {
        id: `tr-${track.id}`,
      });

      assert.equal(response.status, 404);
      assert.equal(envelope(response).error.code, 70);
    });

    it("requires an id", async () => {
      const { credential } = await setup();

      const response = await call("stream", credential);

      assert.equal(envelope(response).error.code, 10);
    });
  });

  describe("server information", () => {
    it("reports a valid license", async () => {
      const { credential } = await setup();

      const response = await call("getLicense", credential);

      assert.equal(envelope(response).license.valid, true);
    });

    it("lists the supported OpenSubsonic extensions", async () => {
      const { credential } = await setup();

      const response = await call("getOpenSubsonicExtensions", credential);

      const names = envelope(response).openSubsonicExtensions.map(
        (extension: { name: string }) => extension.name
      );
      assert(names.includes("formPost"));
      assert(names.includes("apiKeyAuthentication"));
    });

    it("lists the extensions without credentials", async () => {
      const response = await api
        .get("/subsonic/rest/getOpenSubsonicExtensions")
        .query({ f: "json" });

      assert.equal(envelope(response).status, "ok");
    });

    it("lists one music folder", async () => {
      const { credential } = await setup();

      const response = await call("getMusicFolders", credential);

      assert.equal(envelope(response).musicFolders.musicFolder.length, 1);
    });

    it("answers an unknown method with a generic error", async () => {
      const { credential } = await setup();

      for (const method of ["getBogus", "constructor"]) {
        const response = await call(method, credential);
        assert.equal(envelope(response).status, "failed", method);
        assert.equal(envelope(response).error.code, 0, method);
      }
    });
  });
});
