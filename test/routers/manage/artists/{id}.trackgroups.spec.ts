import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import prisma from "../../../../prisma/prisma";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/artists/{artistId}/trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET / with one trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const response = await requestApp
        .get(`manage/artists/${artist.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].title, trackGroup.title);
      assert(response.statusCode === 200);
    });

    it("should GET / without tracks", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        tracks: [],
      });
      const response = await requestApp
        .get(`manage/artists/${artist.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert(response.statusCode === 200);
    });

    it("should GET / get an unpublished", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, { publishedAt: null });
      const response = await requestApp
        .get(`manage/artists/${artist.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert(response.statusCode === 200);
    });

    it("should GET / get a published album", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, { publishedAt: new Date() });
      const response = await requestApp
        .get(`manage/artists/${artist.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert(response.statusCode === 200);
    });

    it("should not GET / hidden song draft albums", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        isHiddenTrackGroupForSongDrafts: true,
        urlSlug: "hidden-draft",
      });
      const visibleAlbum = await createTrackGroup(artist.id, {
        urlSlug: "visible-album",
      });
      const response = await requestApp
        .get(`manage/artists/${artist.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, visibleAlbum.id);
      assert(response.statusCode === 200);
    });

    it("should GET / ordered by release date", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const mostRecent = await createTrackGroup(artist.id, {
        title: "most recent",
        releaseDate: "2024-11-28T12:52:08.206Z",
      });
      const middle = await createTrackGroup(artist.id, {
        title: "middle",
        urlSlug: "a-second-album",
        releaseDate: "2023-11-28T12:52:08.206Z",
      });
      const oldest = await createTrackGroup(artist.id, {
        title: "oldest",
        urlSlug: "a-oldest-album",
        releaseDate: "2022-11-28T12:52:08.206Z",
      });
      const response = await requestApp
        .get(`manage/artists/${artist.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results[0].id, mostRecent.id);
      assert.equal(response.body.results[1].id, middle.id);
      assert.equal(response.body.results[2].id, oldest.id);

      assert(response.statusCode === 200);
    });
  });

  describe("GET with includeLabelReleases", () => {
    it("should return releases from artists the label manages via ArtistLabel", async () => {
      const { user: labelUser, accessToken: labelAccessToken } =
        await createUser({ email: "label@test.com" });
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });

      const label = await createArtist(labelUser.id, {
        name: "Test Label",
        urlSlug: "test-label",
        isLabelProfile: true,
      });
      const managedArtist = await createArtist(artistUser.id, {
        name: "Managed Artist",
        urlSlug: "managed-artist",
      });

      await prisma.artistLabel.create({
        data: {
          labelUserId: labelUser.id,
          artistId: managedArtist.id,
          canLabelAddReleases: true,
          canLabelManageArtist: true,
        },
      });

      const labelRelease = await createTrackGroup(managedArtist.id, {
        title: "Managed Artist Release",
        urlSlug: "managed-artist-release",
      });

      const response = await requestApp
        .get(`manage/artists/${label.id}/trackGroups?includeLabelReleases=true`)
        .set("Cookie", [`jwt=${labelAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, labelRelease.id);
    });

    it("should not return releases from unrelated artists", async () => {
      const { user: labelUser, accessToken: labelAccessToken } =
        await createUser({ email: "label2@test.com" });
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });

      const label = await createArtist(labelUser.id, {
        name: "Test Label 2",
        urlSlug: "test-label-2",
        isLabelProfile: true,
      });
      const unrelatedArtist = await createArtist(otherUser.id, {
        name: "Unrelated Artist",
        urlSlug: "unrelated-artist",
      });

      await createTrackGroup(unrelatedArtist.id, {
        title: "Unrelated Release",
        urlSlug: "unrelated-release",
      });

      const response = await requestApp
        .get(`manage/artists/${label.id}/trackGroups?includeLabelReleases=true`)
        .set("Cookie", [`jwt=${labelAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("should include both the label's own releases and managed artist releases", async () => {
      const { user: labelUser, accessToken: labelAccessToken } =
        await createUser({ email: "label3@test.com" });
      const { user: artistUser } = await createUser({
        email: "artist3@test.com",
      });

      const label = await createArtist(labelUser.id, {
        name: "Test Label 3",
        urlSlug: "test-label-3",
        isLabelProfile: true,
      });
      const managedArtist = await createArtist(artistUser.id, {
        name: "Managed Artist 3",
        urlSlug: "managed-artist-3",
      });

      await prisma.artistLabel.create({
        data: {
          labelUserId: labelUser.id,
          artistId: managedArtist.id,
          canLabelAddReleases: true,
          canLabelManageArtist: true,
        },
      });

      const ownRelease = await createTrackGroup(label.id, {
        title: "Label Own Release",
        urlSlug: "label-own-release",
      });
      const managedRelease = await createTrackGroup(managedArtist.id, {
        title: "Managed Release",
        urlSlug: "managed-release",
      });

      const response = await requestApp
        .get(`manage/artists/${label.id}/trackGroups?includeLabelReleases=true`)
        .set("Cookie", [`jwt=${labelAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 2);
      const ids = response.body.results.map((r: { id: number }) => r.id);
      assert(ids.includes(ownRelease.id));
      assert(ids.includes(managedRelease.id));
    });

    it("should include unpublished releases from managed artists", async () => {
      const { user: labelUser, accessToken: labelAccessToken } =
        await createUser({ email: "label4@test.com" });
      const { user: artistUser } = await createUser({
        email: "artist4@test.com",
      });

      const label = await createArtist(labelUser.id, {
        name: "Test Label 4",
        urlSlug: "test-label-4",
        isLabelProfile: true,
      });
      const managedArtist = await createArtist(artistUser.id, {
        name: "Managed Artist 4",
        urlSlug: "managed-artist-4",
      });

      await prisma.artistLabel.create({
        data: {
          labelUserId: labelUser.id,
          artistId: managedArtist.id,
          canLabelAddReleases: true,
          canLabelManageArtist: true,
        },
      });

      const unpublishedRelease = await createTrackGroup(managedArtist.id, {
        title: "Unpublished Managed Release",
        urlSlug: "unpublished-managed-release",
        publishedAt: null,
      });

      const response = await requestApp
        .get(`manage/artists/${label.id}/trackGroups?includeLabelReleases=true`)
        .set("Cookie", [`jwt=${labelAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, unpublishedRelease.id);
    });
  });

  describe("POST", () => {
    it("should POST an album successfully", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`manage/artists/${artist.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
          urlSlug: "a-title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "A title");
      assert.equal(response.body.result.minPrice, 500);
    });

    it("should fail to POST an album without a slug", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`manage/artists/${artist.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "Argument `urlSlug` is missing.");
    });

    it("should fail to POST an album when a slug already exists", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
          urlSlug: trackGroup.urlSlug,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      assert.equal(
        response.body.error,
        "Can't create a trackGroup with an existing urlSlug"
      );
    });

    it("should POST an album with an empty string title", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "",
          urlSlug: "mi-temp-slug-new-album",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "");
    });

    it("should not POST an album when artistId doesn't belong to user", async () => {
      const { accessToken } = await createUser({ email: "test@testcom" });
      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const artist = await createArtist(artistUser.id);
      const response = await requestApp
        .post(`manage/artists/${artist.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 404);
      assert.equal(
        response.body.error,
        "Artist not found or user does not have permission to edit"
      );
    });

    it("should POST an album successfully with a different paymentToUserId", async () => {
      const { user: labelUser, accessToken: labelAccessToken } =
        await createUser({ email: "label@testcom" });
      const { user } = await createUser({
        email: "artist@testcom",
      });
      const artist = await createArtist(user.id);
      await prisma.artistLabel.create({
        data: {
          labelUserId: labelUser.id,
          artistId: artist.id,
          canLabelAddReleases: true,
          canLabelManageArtist: true,
        },
      });
      const response = await requestApp
        .post(`manage/artists/${artist.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
          urlSlug: "a-title",
        })
        .set("Cookie", [`jwt=${labelAccessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 200);
      assert.equal(response.body.result.paymentToUserId, labelUser.id);
      assert.equal(response.body.result.title, "A title");
      assert.equal(response.body.result.minPrice, 500);
    });
  });
});
