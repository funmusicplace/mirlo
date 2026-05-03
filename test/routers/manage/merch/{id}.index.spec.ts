import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createMerch,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/merch/{merchId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should get a merch item", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const merch = await createMerch(artist.id, {});

      const response = await requestApp
        .get(`manage/merch/${merch.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
    });
  });

  describe("PUT", () => {
    it("should allow linking a track group that belongs to the merch's artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const merch = await createMerch(artist.id, {});

      const response = await requestApp
        .put(`manage/merch/${merch.id}`)
        .send({ includePurchaseTrackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        response.body.result.includePurchaseTrackGroup.id,
        trackGroup.id
      );
    });

    it("should allow linking a label release (paymentToUserId matches logged-in user)", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const labelArtist = await createArtist(user.id);

      // A roster artist owned by a different user
      const { user: rosterUser } = await createUser({
        email: "roster@testcom",
      });
      const rosterArtist = await createArtist(rosterUser.id);

      // Label release: belongs to the roster artist but payment goes to the label user
      const labelRelease = await createTrackGroup(rosterArtist.id, {
        paymentToUserId: user.id,
      });

      const merch = await createMerch(labelArtist.id, {});

      const response = await requestApp
        .put(`manage/merch/${merch.id}`)
        .send({ includePurchaseTrackGroupId: labelRelease.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        response.body.result.includePurchaseTrackGroup.id,
        labelRelease.id
      );
    });

    it("should allow updating platformPercent", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id, {});

      const response = await requestApp
        .put(`manage/merch/${merch.id}`)
        .send({ platformPercent: 12 })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.platformPercent, 12);
    });

    it("should reject linking a track group that does not belong to the user", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id, {});

      // A track group owned by a completely different user
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      const otherArtist = await createArtist(otherUser.id);
      const unrelatedTrackGroup = await createTrackGroup(otherArtist.id);

      const response = await requestApp
        .put(`manage/merch/${merch.id}`)
        .send({ includePurchaseTrackGroupId: unrelatedTrackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("persists externalUrl on the merch item (#1424)", async () => {
      const { user, accessToken } = await createUser({
        email: "external-merch@example.com",
      });
      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id, {});

      const externalUrl = "https://artistshop.example.com/vinyl";
      const response = await requestApp
        .put(`manage/merch/${merch.id}`)
        .send({ externalUrl })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.externalUrl, externalUrl);

      // Clearing it back to null should also work.
      const cleared = await requestApp
        .put(`manage/merch/${merch.id}`)
        .send({ externalUrl: null })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(cleared.status, 200);
      assert.equal(cleared.body.result.externalUrl, null);
    });
  });
});
