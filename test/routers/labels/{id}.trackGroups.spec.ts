import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import request from "supertest";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("GET /v1/labels/{id}/trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should return only track groups where label receives payments", async () => {
    const { user: labelUser } = await createUser({
      email: "label@example.com",
      isLabelAccount: true,
    });
    const label = await createProfile(labelUser.id, {
      name: "My Record Label",
      isLabelProfile: true,
    });

    const { user: profileOwner } = await createUser({
      email: "artist@example.com",
    });
    const profile = await createProfile(profileOwner.id, {
      name: "Featured Artist",
    });

    // Create album with label as payment recipient (should appear)
    const labelOwnedAlbum = await createTrackGroup(profile.id, {
      title: "Label Released Album",
      publishedAt: new Date(),
    });
    await prisma.trackGroup.update({
      where: { id: labelOwnedAlbum.id },
      data: { paymentToUserId: labelUser.id },
    });

    // Create album without label payment (should NOT appear)
    const profileOwnedAlbum = await createTrackGroup(profile.id, {
      title: "Artist Original Album",
      publishedAt: new Date(),
      urlSlug: "artist-original-album",
    });

    const response = await requestApp
      .get(`labels/${label.urlSlug}/trackGroups`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(
      response.body.results[0].title,
      "Label Released Album",
      "Only label-owned album should appear"
    );
    assert.equal(
      response.body.results[0].paymentToUserId,
      labelUser.id,
      "Album should have label as payment recipient"
    );
  });

  it("should include track groups where label IS the artist", async () => {
    const { user: labelUser } = await createUser({
      email: "label2@example.com",
      isLabelAccount: true,
    });
    const label = await createProfile(labelUser.id, {
      name: "Label as Artist",
      isLabelProfile: true,
    });

    // Create album directly by the label artist
    const labelProfileAlbum = await createTrackGroup(label.id, {
      title: "Label's Own Release",
      publishedAt: new Date(),
    });

    const response = await requestApp
      .get(`labels/${label.urlSlug}/trackGroups`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(
      response.body.results[0].title,
      "Label's Own Release",
      "Label's own album should appear"
    );
  });

  it("should not include artist-owned albums even if label manages the artist", async () => {
    const { user: labelUser } = await createUser({
      email: "label3@example.com",
      isLabelAccount: true,
    });
    const label = await createProfile(labelUser.id, {
      name: "Managing Label",
      isLabelProfile: true,
    });

    const { user: profileOwner } = await createUser({
      email: "artist2@example.com",
    });
    const profile = await createProfile(profileOwner.id, {
      name: "Managed Artist",
    });

    // Set up label relationship
    await prisma.artistLabel.create({
      data: {
        labelUserId: labelUser.id,
        artistId: profile.id,
        canLabelManageArtist: true,
        canLabelAddReleases: true,
        isLabelApproved: true,
        isArtistApproved: true,
      },
    });

    // Artist creates their own album
    const profileAlbum = await createTrackGroup(profile.id, {
      title: "Artist Personal Album",
      publishedAt: new Date(),
    });

    // Label creates an album for the artist
    const labelCreatedAlbum = await createTrackGroup(profile.id, {
      title: "Label Created Album",
      publishedAt: new Date(),
      urlSlug: "label-created-album",
    });
    await prisma.trackGroup.update({
      where: { id: labelCreatedAlbum.id },
      data: { paymentToUserId: labelUser.id },
    });

    const response = await requestApp
      .get(`labels/${label.urlSlug}/trackGroups`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.body.results.length,
      1,
      "Only label-owned album should appear, not artist's personal album"
    );
    assert.equal(
      response.body.results[0].title,
      "Label Created Album",
      "Only label-created album should be returned"
    );
    assert.equal(response.body.results[0].paymentToUserId, labelUser.id);
  });

  it("should exclude unpublished track groups", async () => {
    const { user: labelUser } = await createUser({
      email: "label4@example.com",
      isLabelAccount: true,
    });
    const label = await createProfile(labelUser.id, {
      name: "Draft Label",
      isLabelProfile: true,
    });

    const { user: profileOwner } = await createUser({
      email: "artist3@example.com",
    });
    const profile = await createProfile(profileOwner.id, {
      name: "Draft Artist",
    });

    // Create unpublished album
    const unpublishedAlbum = await createTrackGroup(profile.id, {
      title: "Unpublished Album",
      publishedAt: null,
    });
    await prisma.trackGroup.update({
      where: { id: unpublishedAlbum.id },
      data: { paymentToUserId: labelUser.id },
    });

    // Create published album
    const publishedAlbum = await createTrackGroup(profile.id, {
      title: "Published Album",
      publishedAt: new Date(),
      urlSlug: "published-album",
    });
    await prisma.trackGroup.update({
      where: { id: publishedAlbum.id },
      data: { paymentToUserId: labelUser.id },
    });

    const response = await requestApp
      .get(`labels/${label.urlSlug}/trackGroups`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(
      response.body.results[0].title,
      "Published Album",
      "Only published albums should appear"
    );
  });

  it("should support excludeArtistId query parameter", async () => {
    const { user: labelUser } = await createUser({
      email: "label5@example.com",
      isLabelAccount: true,
    });
    const label = await createProfile(labelUser.id, {
      name: "Filtering Label",
      isLabelProfile: true,
    });

    const { user: profileUser1 } = await createUser({
      email: "artist4@example.com",
    });
    const profile1 = await createProfile(profileUser1.id, {
      name: "First Artist",
    });

    const { user: profileUser2 } = await createUser({
      email: "artist5@example.com",
    });
    const profile2 = await createProfile(profileUser2.id, {
      name: "Second Artist",
    });

    // Create albums for both artists
    const album1 = await createTrackGroup(profile1.id, {
      title: "First Artist Album",
      publishedAt: new Date(),
    });
    await prisma.trackGroup.update({
      where: { id: album1.id },
      data: { paymentToUserId: labelUser.id },
    });

    const album2 = await createTrackGroup(profile2.id, {
      title: "Second Artist Album",
      publishedAt: new Date(),
      urlSlug: "second-artist-album",
    });
    await prisma.trackGroup.update({
      where: { id: album2.id },
      data: { paymentToUserId: labelUser.id },
    });

    // Get all albums
    const allResponse = await requestApp
      .get(`labels/${label.urlSlug}/trackGroups`)
      .set("Accept", "application/json");

    assert.equal(allResponse.body.results.length, 2);

    // Get albums excluding first artist
    const filteredResponse = await requestApp
      .get(`labels/${label.urlSlug}/trackGroups`)
      .query({ excludeArtistId: profile1.id })
      .set("Accept", "application/json");

    assert.equal(filteredResponse.body.results.length, 1);
    assert.equal(
      filteredResponse.body.results[0].title,
      "Second Artist Album",
      "Should exclude albums from specified artist"
    );
  });
});
