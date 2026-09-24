import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../../../utils";
import { requestApp } from "../../../utils";

const setUpSale = async () => {
  const { user: artistUser, accessToken } = await createUser({
    email: "artist@artist.com",
  });
  const profile = await createProfile(artistUser.id);
  const trackGroup = await createTrackGroup(profile.id);

  const { user: purchaser } = await createUser({
    email: "purchaser@artist.com",
  });

  const purchase = await createUserTrackGroupPurchase(
    purchaser.id,
    trackGroup.id
  );

  assert(purchase.userTransactionId);

  return {
    accessToken,
    artistUser,
    profile,
    purchaser,
    transactionId: purchase.userTransactionId,
  };
};

describe("manage/sales/{transactionId}/resendReceipt", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should POST / 401 without a logged in user", async () => {
      const { transactionId } = await setUpSale();

      const response = await requestApp
        .post(`manage/sales/${transactionId}/resendReceipt`)
        .send({})
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should POST / 404 for a transaction that doesn't exist", async () => {
      const { accessToken } = await setUpSale();

      const response = await requestApp
        .post(`manage/sales/6f0d5bf0-0000-4000-8000-000000000000/resendReceipt`)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should POST / 200 for the artist who made the sale", async () => {
      const { accessToken, transactionId, purchaser } = await setUpSale();

      const response = await requestApp
        .post(`manage/sales/${transactionId}/resendReceipt`)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.sentTo, purchaser.email);
    });

    it("should POST / 200 for an admin", async () => {
      const { transactionId, purchaser } = await setUpSale();
      const { accessToken: adminToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .post(`manage/sales/${transactionId}/resendReceipt`)
        .send({})
        .set("Cookie", [`jwt=${adminToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.sentTo, purchaser.email);
    });

    it("should POST / 401 for someone who doesn't manage the artist", async () => {
      const { transactionId } = await setUpSale();
      const { accessToken: strangerToken } = await createUser({
        email: "stranger@stranger.com",
      });

      const response = await requestApp
        .post(`manage/sales/${transactionId}/resendReceipt`)
        .send({})
        .set("Cookie", [`jwt=${strangerToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });
  });
});
