import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";

import {
  clearTables,
  createUser,
  createArtist,
  createTrackGroup,
  createUserTrackGroupPurchase,
  createUserTrackPurchase,
  createTrack,
} from "../../utils";
import { requestApp } from "../utils";

describe("manage/sales", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET /", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await requestApp
        .get("manage/sales")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return empty results if user has no sales", async () => {
      const { accessToken } = await createUser({
        email: "test@test.com",
      });

      const response = await requestApp
        .get("manage/sales")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.results, []);
      assert.equal(response.body.total, 0);
      assert.equal(response.body.totalAmount, 0);
      assert.equal(response.body.totalSupporters, 0);
    });

    it("should return sales for artist's track group purchases", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      // Create a purchase
      await createUserTrackGroupPurchase(buyer.user.id, trackGroup.id, {
        amount: 2000,
        currency: "usd",
      });

      const response = await requestApp
        .get("manage/sales")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.totalAmount, 2000);
      assert.equal(response.body.totalSupporters, 1);

      const sale = response.body.results[0];
      assert.equal(sale.amount, 2000);
      assert.equal(sale.currency, "usd");
      assert(sale.artist);
      assert.equal(sale.artist[0].id, artist.id);
    });

    it("should return sales for track purchases", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id);

      await createUserTrackPurchase(buyer.user.id, track.id, {
        amount: 500,
        currency: "usd",
      });

      const response = await requestApp
        .get("manage/sales")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.totalAmount, 500);
    });

    it("should filter sales by artist ID", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist1 = await createArtist(user.id, { name: "Artist 1" });
      const artist2 = await createArtist(user.id, { name: "Artist 2" });

      const trackGroup1 = await createTrackGroup(artist1.id);
      const trackGroup2 = await createTrackGroup(artist2.id);

      await createUserTrackGroupPurchase(buyer.user.id, trackGroup1.id, {
        amount: 1000,
      });
      await createUserTrackGroupPurchase(buyer.user.id, trackGroup2.id, {
        amount: 2000,
      });

      // Filter by artist1
      const response = await requestApp
        .get(`manage/sales?artistIds=${artist1.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.totalAmount, 1000);
      assert.equal(response.body.results[0].artist[0].id, artist1.id);
    });

    it("should handle CSV format export", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      await createUserTrackGroupPurchase(buyer.user.id, trackGroup.id, {
        amount: 2000,
        currency: "usd",
      });

      const response = await requestApp
        .get("manage/sales?format=csv")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "text/csv");

      assert.equal(response.statusCode, 200);
      assert.equal(response.type, "text/csv");
      assert(response.text.includes("User-Friendly ID"));
      assert(response.text.includes("Date"));
      assert(response.text.includes("Artist"));
      assert(response.text.includes("Track Group Purchases"));
      assert(response.text.includes("Stripe ID"));
      assert(response.text.includes("Discount Percent"));
    });

    it("should stringify nested purchases in CSV export", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      await createUserTrackGroupPurchase(buyer.user.id, trackGroup.id, {
        amount: 2000,
        currency: "usd",
      });

      const response = await requestApp
        .get("manage/sales?format=csv")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "text/csv");

      assert.equal(response.statusCode, 200);
      // Check that CSV contains the track group title (stringified, not JSON)
      // The response.text should contain the track group title in a readable format
      assert(response.text.toLowerCase().includes("test track"));
      // Make sure it's not JSON
      assert(!response.text.includes('"trackGroup"'));
    });

    it("should paginate results", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });
      const buyer2 = await createUser({
        email: "buyer2@test.com",
      });
      const buyer3 = await createUser({
        email: "buyer3@test.com",
      });
      const buyer4 = await createUser({
        email: "buyer4@test.com",
      });
      const buyer5 = await createUser({
        email: "buyer5@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      // Create multiple purchases
      await createUserTrackGroupPurchase(buyer.user.id, trackGroup.id, {
        amount: 100,
        createdAt: new Date(Date.now() - 1000000),
      });
      await createUserTrackGroupPurchase(buyer2.user.id, trackGroup.id, {
        amount: 100,
        createdAt: new Date(Date.now() - 2000000),
      });
      await createUserTrackGroupPurchase(buyer3.user.id, trackGroup.id, {
        amount: 100,
        createdAt: new Date(Date.now() - 3000000),
      });
      await createUserTrackGroupPurchase(buyer4.user.id, trackGroup.id, {
        amount: 100,
        createdAt: new Date(Date.now() - 4000000),
      });
      await createUserTrackGroupPurchase(buyer5.user.id, trackGroup.id, {
        amount: 100,
        createdAt: new Date(Date.now() - 5000000),
      });

      // Get first page with take=2
      const response1 = await requestApp
        .get("manage/sales?take=2&skip=0")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response1.statusCode, 200);
      assert.equal(response1.body.results.length, 2);
      assert.equal(response1.body.total, 5);

      // Get second page
      const response2 = await requestApp
        .get("manage/sales?take=2&skip=2")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response2.statusCode, 200);
      assert.equal(response2.body.results.length, 2);
    });

    it("should not include userId in results", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      await createUserTrackGroupPurchase(buyer.user.id, trackGroup.id, {
        amount: 2000,
      });

      const response = await requestApp
        .get("manage/sales")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].userId, undefined);
    });

    it("should include stripeId and discountPercent in results", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      await createUserTrackGroupPurchase(buyer.user.id, trackGroup.id, {
        amount: 2000,
      });

      const response = await requestApp
        .get("manage/sales")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const sale = response.body.results[0];
      // stripeId and discountPercent should be in the result
      assert(Object.prototype.hasOwnProperty.call(sale, "stripeId"));
      assert(Object.prototype.hasOwnProperty.call(sale, "discountPercent"));
    });
  });
});
