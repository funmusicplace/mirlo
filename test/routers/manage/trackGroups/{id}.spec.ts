import assert from "node:assert";
import { Readable } from "node:stream";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import { deleteProfile } from "../../../../src/utils/artist";
import { uploadZip, zipExists } from "../../../../src/utils/storage";
import {
  clearTables,
  createArtistLabel,
  createFundraiser,
  createFundraiserPledge,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/trackGroups/{trackGroupId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should clear cached download zips when the title changes (#1606)", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });
      await uploadZip(
        "trackGroup",
        trackGroup.id,
        "320.mp3",
        Readable.from([Buffer.from("zip")])
      );

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ title: "A new title" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        await zipExists("trackGroup", trackGroup.id, "320.mp3"),
        false
      );
    });

    it("should keep cached download zips when only the price changes", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });
      await uploadZip(
        "trackGroup",
        trackGroup.id,
        "320.mp3",
        Readable.from([Buffer.from("zip")])
      );

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ minPrice: 500 })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        await zipExists("trackGroup", trackGroup.id, "320.mp3"),
        true
      );
    });

    it("should update defaultIsPreview on a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, defaultIsPreview: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.defaultIsPreview, false);
    });

    it("should update a track group without artistId in the body", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ defaultIsPreview: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.defaultIsPreview, true);
    });

    it("should move a release to another artist on the same account", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const to = await createProfile(user.id, { urlSlug: "to-artist" });
      const trackGroup = await createTrackGroup(from.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: to.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const moved = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(moved.profileId, to.id);
    });

    it("should move a release's fundraiser along with it", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const to = await createProfile(user.id, { urlSlug: "to-artist" });
      const trackGroup = await createTrackGroup(from.id);
      const fundraiser = await createFundraiser(trackGroup.profileId, {
        trackGroupId: trackGroup.id,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: to.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const moved = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(moved.profileId, to.id);
    });

    it("should refuse to move a release whose fundraiser has open pledges", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: backer } = await createUser({ email: "backer@test.com" });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const to = await createProfile(user.id, { urlSlug: "to-artist" });
      const trackGroup = await createTrackGroup(from.id);
      const fundraiser = await createFundraiser(trackGroup.profileId, {
        trackGroupId: trackGroup.id,
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id);

      const refused = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: to.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(refused.status, 409);
      const unmoved = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(unmoved.profileId, from.id);
      const fundraiserAfter = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserAfter.profileId, from.id);

      await prisma.fundraiserPledge.update({
        where: { id: pledge.id },
        data: { paidAt: new Date() },
      });

      const moved = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: to.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(moved.status, 200);
      const fundraiserMoved = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserMoved.profileId, to.id);
    });

    it("should refuse to move a release whose fundraiser URL the destination already uses", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const to = await createProfile(user.id, { urlSlug: "to-artist" });
      const trackGroup = await createTrackGroup(from.id);
      const fundraiser = await createFundraiser(trackGroup.profileId, {
        trackGroupId: trackGroup.id,
        urlSlug: "new-van",
      });
      await createFundraiser(to.id, { urlSlug: "new-van" });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: to.id, title: "Renamed" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      const unmoved = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(unmoved.profileId, from.id);
      assert.notEqual(unmoved.title, "Renamed");
      const fundraiserAfter = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserAfter.profileId, from.id);
    });

    it("should give a moved release a free slug when the destination already uses it", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const to = await createProfile(user.id, { urlSlug: "to-artist" });
      const trackGroup = await createTrackGroup(from.id, {
        urlSlug: "a-title",
      });
      await createTrackGroup(to.id, { urlSlug: "a-title" });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: to.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const moved = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(moved.profileId, to.id);
      assert.notEqual(moved.urlSlug, "a-title");
    });

    it("should refuse to move a release to someone else's artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const theirs = await createProfile(otherUser.id, {
        urlSlug: "their-artist",
      });
      const trackGroup = await createTrackGroup(from.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ moveToArtistId: theirs.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      const unmoved = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(unmoved.profileId, from.id);
    });

    it("should let the payment go to an approved label", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const profile = await createProfile(user.id);
      await prisma.artistLabel.create({
        data: {
          artistId: profile.id,
          labelUserId: labelUser.id,
          isArtistApproved: true,
          isLabelApproved: true,
        },
      });
      const trackGroup = await createTrackGroup(profile.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ paymentToUserId: labelUser.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const updated = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(updated.paymentToUserId, labelUser.id);
    });

    it("should refuse to send payments to an unapproved label", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const profile = await createProfile(user.id);
      await prisma.artistLabel.create({
        data: {
          artistId: profile.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
        },
      });
      const trackGroup = await createTrackGroup(profile.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ paymentToUserId: labelUser.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      const unchanged = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(unchanged.paymentToUserId, null);
    });

    it("should refuse to send payments to an unrelated user", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ paymentToUserId: otherUser.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should keep saving a release whose existing payee is no longer approved", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      await prisma.trackGroup.update({
        where: { id: trackGroup.id },
        data: { paymentToUserId: labelUser.id },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ title: "New title", paymentToUserId: labelUser.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
    });

    it("should not move a release when only artistId is in the body", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const from = await createProfile(user.id, { urlSlug: "from-artist" });
      const to = await createProfile(user.id, { urlSlug: "to-artist" });
      const trackGroup = await createTrackGroup(from.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: to.id, title: "Still here" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const unmoved = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(unmoved.profileId, from.id);
    });

    it("should reject a negative minPrice", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ minPrice: -100 })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should reject a negative suggestedPrice", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ suggestedPrice: -50 })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should reject a duplicate urlSlug for the same artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, { urlSlug: "taken-slug" });
      const otherTrackGroup = await createTrackGroup(profile.id, {
        urlSlug: "another-slug",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${otherTrackGroup.id}`)
        .send({ urlSlug: "taken-slug" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should notify followers when flipping a published trackGroup from private to public", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-flip@example.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        publishedAt: new Date(),
        isPublic: false,
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: { profileId: profile.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-flip@example.com",
      });
      await prisma.profileUserSubscription.create({
        data: {
          userId: follower.id,
          profileSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-flip",
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id, userId: follower.id },
      });
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].notificationType, "NEW_ARTIST_ALBUM");
    });

    it("should backfill releaseDate when flipping a published trackGroup with no releaseDate to public", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-backfill@example.com",
      });
      const profile = await createProfile(user.id);
      const publishedAt = new Date("2026-05-19T00:00:00.000Z");
      const trackGroup = await createTrackGroup(profile.id, {
        publishedAt,
        isPublic: false,
        releaseDate: null,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        new Date(response.body.result.releaseDate).getTime(),
        publishedAt.getTime()
      );

      const updated = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(updated.releaseDate?.getTime(), publishedAt.getTime());
    });

    it("should not overwrite an existing releaseDate when flipping to public", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-keep-date@example.com",
      });
      const profile = await createProfile(user.id);
      const releaseDate = new Date("2024-01-01T00:00:00.000Z");
      const trackGroup = await createTrackGroup(profile.id, {
        publishedAt: new Date("2026-05-19T00:00:00.000Z"),
        isPublic: false,
        releaseDate,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const updated = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(updated.releaseDate?.getTime(), releaseDate.getTime());
    });

    it("should not notify followers when flipping isPublic on a draft trackGroup", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-draft-flip@example.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        publishedAt: null,
        isPublic: false,
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: { profileId: profile.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-draft-flip@example.com",
      });
      await prisma.profileUserSubscription.create({
        data: {
          userId: follower.id,
          profileSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-draft-flip",
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id },
      });
      assert.equal(notifications.length, 0);
    });

    it("should not notify followers twice when flipping isPublic back and forth", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-toggle@example.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        publishedAt: new Date(),
        isPublic: false,
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: { profileId: profile.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-toggle@example.com",
      });
      await prisma.profileUserSubscription.create({
        data: {
          userId: follower.id,
          profileSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-toggle",
        },
      });

      await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ profileId: profile.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id, userId: follower.id },
      });
      assert.equal(notifications.length, 1);
    });

    it("should find a new slug for a trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);

      await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });
      const otherTrackGroup = await createTrackGroup(profile.id, {
        urlSlug: "mi-temp-slug-album-4",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${otherTrackGroup.id}`)
        .send({
          profileId: profile.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.urlSlug, "a-title-1");
    });

    it("should update coverImageAlt on a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ coverImageAlt: "Abstract blue album artwork" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        response.body.result.coverImageAlt,
        "Abstract blue album artwork"
      );
    });

    it("should save coverCredit and return it from the public GET", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ coverCredit: "Photo by Jane Doe" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.coverCredit, "Photo by Jane Doe");

      const publicResponse = await requestApp
        .get(`trackGroups/${trackGroup.id}`)
        .set("Accept", "application/json");

      assert.equal(publicResponse.status, 200);
      assert.equal(publicResponse.body.result.coverCredit, "Photo by Jane Doe");
    });
  });

  describe("DELETE", () => {
    it("should delete a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);

      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
    });

    it("should cancel unpaid pledges on the release's fundraiser", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: backer } = await createUser({ email: "backer@test.com" });
      const { user: paidBacker } = await createUser({
        email: "paid-backer@test.com",
      });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });
      const fundraiser = await createFundraiser(trackGroup.profileId, {
        trackGroupId: trackGroup.id,
        isAllOrNothing: true,
      });
      const unpaidPledge = await createFundraiserPledge(
        fundraiser.id,
        backer.id
      );
      const paidAt = new Date();
      const paidPledge = await createFundraiserPledge(
        fundraiser.id,
        paidBacker.id,
        { paidAt }
      );

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const refreshedUnpaid = await prisma.fundraiserPledge.findUnique({
        where: { id: unpaidPledge.id },
      });
      assert.notEqual(refreshedUnpaid?.cancelledAt, null);

      const refreshedPaid = await prisma.fundraiserPledge.findUnique({
        where: { id: paidPledge.id },
      });
      assert.equal(refreshedPaid?.cancelledAt, null);
    });
  });

  describe("PUT trackGroupArtists", () => {
    const setup = async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
        urlSlug: "a-title",
      });
      const put = (body: Record<string, unknown>) =>
        requestApp
          .put(`manage/trackGroups/${trackGroup.id}`)
          .send(body)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");
      const stored = () =>
        prisma.trackGroupArtist.findMany({
          where: { trackGroupId: trackGroup.id },
          orderBy: { order: "asc" },
        });
      return { user, accessToken, profile, trackGroup, put, stored };
    };

    it("stores the release artists in order, trimmed, without empty names, linked ones under the current profile name", async () => {
      const { profile, put, stored } = await setup();
      const response = await put({
        trackGroupArtists: [
          { artistName: " Mirb " },
          { artistName: "   " },
          { artistName: "Alice", artistId: profile.id },
        ],
      });
      assert.equal(response.status, 200);
      const artists = await stored();
      assert.deepEqual(
        artists.map((a) => [a.artistName, a.profileId, a.order]),
        [
          ["Mirb", null, 0],
          [profile.name, profile.id, 1],
        ]
      );
    });

    it("keeps the row ids when the list is saved again, with or without ids, and when it is reordered", async () => {
      const { put, stored } = await setup();
      await put({
        trackGroupArtists: [{ artistName: "Mirb" }, { artistName: "Moon" }],
      });
      const [mirb, moon] = await stored();

      await put({
        trackGroupArtists: [{ artistName: "Mirb" }, { artistName: "Moon" }],
      });
      assert.deepEqual(
        (await stored()).map((a) => a.id),
        [mirb.id, moon.id]
      );

      await put({
        trackGroupArtists: [
          { id: moon.id, artistName: "Moon" },
          { id: mirb.id, artistName: "Mirb" },
        ],
      });
      assert.deepEqual(
        (await stored()).map((a) => [a.id, a.artistName, a.order]),
        [
          [moon.id, "Moon", 0],
          [mirb.id, "Mirb", 1],
        ]
      );
    });

    it("matches rows sent without ids to the stored ones by profile or by name when the list changes", async () => {
      const { profile, put, stored } = await setup();
      await put({
        trackGroupArtists: [
          { artistName: "Mirb" },
          { artistName: profile.name, artistId: profile.id },
        ],
      });
      const [mirb, linked] = await stored();

      const response = await put({
        trackGroupArtists: [
          { artistName: "Renamed link", artistId: profile.id },
          { artistName: "mirb" },
          { artistName: "Star" },
        ],
      });
      assert.equal(response.status, 200);
      const artists = await stored();
      assert.deepEqual(
        artists.map((a) => [a.id, a.artistName, a.order]),
        [
          [linked.id, profile.name, 0],
          [mirb.id, "mirb", 1],
          [artists[2].id, "Star", 2],
        ]
      );
      assert.ok(![mirb.id, linked.id].includes(artists[2].id));
    });

    it("keeps two different linked profiles that share a name", async () => {
      const { user, put, stored } = await setup();
      const first = await createProfile(user.id, {
        name: "Alice",
        urlSlug: "alice-one",
      });
      const second = await createProfile(user.id, {
        name: "Alice",
        urlSlug: "alice-two",
      });
      const response = await put({
        trackGroupArtists: [
          { artistName: "Alice", artistId: first.id },
          { artistName: "Alice", artistId: second.id },
        ],
      });
      assert.equal(response.status, 200);
      assert.deepEqual(
        (await stored()).map((a) => a.profileId),
        [first.id, second.id]
      );
    });

    it("treats an id from another release, a repeated id or a malformed id as a new row", async () => {
      const { profile, put, stored } = await setup();
      const otherTrackGroup = await createTrackGroup(profile.id, {
        urlSlug: "another-title",
      });
      const foreign = await prisma.trackGroupArtist.create({
        data: { trackGroupId: otherTrackGroup.id, artistName: "Foreign" },
      });
      await put({ trackGroupArtists: [{ artistName: "Mirb" }] });
      const [mirb] = await stored();

      const response = await put({
        trackGroupArtists: [
          { id: mirb.id, artistName: "Mirb" },
          { id: mirb.id, artistName: "Moon" },
          { id: foreign.id, artistName: "Star" },
          { id: "not-a-uuid", artistName: "Sun" },
        ],
      });
      assert.equal(response.status, 200);
      const artists = await stored();
      assert.deepEqual(
        artists.map((a) => a.artistName),
        ["Mirb", "Moon", "Star", "Sun"]
      );
      assert.equal(artists[0].id, mirb.id);
      assert.equal(new Set(artists.map((a) => a.id)).size, 4);
      assert.ok(!artists.some((a) => a.id === foreign.id));
      const foreignAfter = await prisma.trackGroupArtist.findUniqueOrThrow({
        where: { id: foreign.id },
      });
      assert.equal(foreignAfter.trackGroupId, otherTrackGroup.id);
      assert.equal(foreignAfter.artistName, "Foreign");
    });

    it("drops duplicates: the same profile twice, names that only differ by accents or case, and a free name equal to a linked one", async () => {
      const { profile, put, stored } = await setup();
      const response = await put({
        trackGroupArtists: [
          { artistName: "Beyoncé" },
          { artistName: "beyonce" },
          { artistName: profile.name },
          { artistName: "Alias", artistId: profile.id },
          { artistName: "Alias again", artistId: profile.id },
        ],
      });
      assert.equal(response.status, 200);
      assert.deepEqual(
        (await stored()).map((a) => [a.artistName, a.profileId]),
        [
          ["Beyoncé", null],
          [profile.name, profile.id],
        ]
      );
    });

    it("swaps the profiles of two linked rows without failing", async () => {
      const { user, put, stored } = await setup();
      const first = await createProfile(user.id, { name: "First" });
      const second = await createProfile(user.id, { name: "Second" });
      await put({
        trackGroupArtists: [
          { artistName: "First", artistId: first.id },
          { artistName: "Second", artistId: second.id },
        ],
      });
      const [a, b] = await stored();

      const response = await put({
        trackGroupArtists: [
          { id: a.id, artistName: "Second", artistId: second.id },
          { id: b.id, artistName: "First", artistId: first.id },
        ],
      });
      assert.equal(response.status, 200);
      assert.deepEqual(
        (await stored()).map((row) => [row.id, row.profileId]),
        [
          [a.id, second.id],
          [b.id, first.id],
        ]
      );
    });

    it("links a label roster artist the label can manage, keeps the link once the label loses that right, and refuses a roster artist the label cannot manage", async () => {
      const { user, put, stored } = await setup();
      const { user: artistUser } = await createUser({
        email: "artist@testcom",
      });
      const managed = await createProfile(artistUser.id, { name: "Managed" });
      const notManaged = await createProfile(artistUser.id, {
        name: "Not managed",
      });
      await createArtistLabel({
        artistId: managed.id,
        labelUserId: user.id,
        canLabelManageArtist: true,
      });
      await createArtistLabel({
        artistId: notManaged.id,
        labelUserId: user.id,
        canLabelManageArtist: false,
      });

      await put({
        trackGroupArtists: [
          { artistName: "Managed", artistId: managed.id },
          { artistName: "Not managed", artistId: notManaged.id },
        ],
      });
      const [linked] = await stored();
      assert.deepEqual(
        (await stored()).map((a) => a.profileId),
        [managed.id, null]
      );

      await prisma.artistLabel.delete({
        where: {
          labelUserId_artistId: { labelUserId: user.id, artistId: managed.id },
        },
      });
      await put({
        trackGroupArtists: [{ artistName: "Managed", artistId: managed.id }],
      });
      assert.equal((await stored())[0].profileId, managed.id);
      await put({
        trackGroupArtists: [
          { id: linked.id, artistName: "Managed", artistId: managed.id },
        ],
      });
      assert.equal((await stored())[0].profileId, managed.id);
    });

    it("unlinks a deleted profile but keeps its name", async () => {
      const { user, put, stored } = await setup();
      const other = await createProfile(user.id, { name: "Gone" });
      await put({
        trackGroupArtists: [{ artistName: "Gone", artistId: other.id }],
      });
      await deleteProfile(user.id, other.id);
      const [row] = await stored();
      assert.equal(row.artistName, "Gone");
      assert.equal(row.profileId, null);
    });

    it("renames the release credits of a profile when it is renamed, and clears their zips", async () => {
      const { profile, trackGroup, put, stored, accessToken } = await setup();
      await put({
        trackGroupArtists: [{ artistName: profile.name, artistId: profile.id }],
      });
      await uploadZip(
        "trackGroup",
        trackGroup.id,
        "320.mp3",
        Readable.from([Buffer.from("zip")])
      );

      const response = await requestApp
        .put(`manage/artists/${profile.id}`)
        .send({ name: "Renamed" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 200);
      assert.equal((await stored())[0].artistName, "Renamed");
      assert.equal(
        await zipExists("trackGroup", trackGroup.id, "320.mp3"),
        false
      );
    });

    it("rejects a null list and a string artistId", async () => {
      const { put } = await setup();
      assert.equal((await put({ trackGroupArtists: null })).status, 400);
      assert.equal(
        (await put({ trackGroupArtists: [{ artistName: "A", artistId: "5" }] }))
          .status,
        400
      );
    });

    it("keeps the name but drops a link to a profile that does not exist", async () => {
      const { put, stored } = await setup();
      const response = await put({
        trackGroupArtists: [{ artistName: "Ghost", artistId: 999999 }],
      });
      assert.equal(response.status, 200);
      const artists = await stored();
      assert.equal(artists[0].artistName, "Ghost");
      assert.equal(artists[0].profileId, null);
    });

    it("keeps the name but does not link a profile the user cannot edit", async () => {
      const { put, stored } = await setup();
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      const otherProfile = await createProfile(otherUser.id);
      const response = await put({
        trackGroupArtists: [
          { artistName: "Someone Else", artistId: otherProfile.id },
        ],
      });
      assert.equal(response.status, 200);
      const artists = await stored();
      assert.equal(artists[0].artistName, "Someone Else");
      assert.equal(artists[0].profileId, null);
    });

    it("leaves the release artists alone when the body does not send them", async () => {
      const { put, stored } = await setup();
      await put({ trackGroupArtists: [{ artistName: "Mirb" }] });
      const response = await put({ title: "Another title" });
      assert.equal(response.status, 200);
      assert.equal((await stored()).length, 1);
    });

    it("clears cached download zips when the release artists change, not when they stay the same", async () => {
      const { trackGroup, put } = await setup();
      await put({ trackGroupArtists: [{ artistName: "Mirb" }] });
      await uploadZip(
        "trackGroup",
        trackGroup.id,
        "320.mp3",
        Readable.from([Buffer.from("zip")])
      );

      await put({ trackGroupArtists: [{ artistName: "Mirb" }] });
      assert.equal(
        await zipExists("trackGroup", trackGroup.id, "320.mp3"),
        true
      );

      await put({ trackGroupArtists: [{ artistName: "Various Artists" }] });
      assert.equal(
        await zipExists("trackGroup", trackGroup.id, "320.mp3"),
        false
      );
    });
  });
});
