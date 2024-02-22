import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";
import prisma from "../../../prisma/prisma";

describe("trackGroups/{id}/purchase", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should POST / 404", async () => {
      const response = await requestApp
        .post("trackGroups/1/purchase")
        .send({})
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should POST / 400 if the price sent is less than the trackGroup price", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        minPrice: 500,
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .send({
          price: "200",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.match(response.body.error, /.*at least.*/);
      assert.equal(response.statusCode, 400);
    });

    it("should POST / 400 if the price set and no stripeAccountId", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        minPrice: 0,
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .send({
          price: "200",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.match(response.body.error, /.*payment processor.*/);
      assert.equal(response.statusCode, 400);
    });

    it("should POST / 200 if priceZero and user logged in", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });

      const { user: purchaser, accessToken: purchaseAccessToken } =
        await createUser({
          email: "purchaser@purchaser.com",
        });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        minPrice: 0,
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .send({
          price: "0",
        })
        .set("Cookie", [`jwt=${purchaseAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(
        response.body.redirectUrl,
        `/${artist.urlSlug}/release/${trackGroup.urlSlug}/download?email=${purchaser.email}`
      );
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
        },
      });
      assert(purchase);
      assert.equal(purchase.pricePaid, 0);
      assert.notEqual(purchase.singleDownloadToken, null);
    });

    it("should POST / 500 if price  zero and no logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });

      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        minPrice: 0,
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .send({
          price: "0",
        })
        .set("Accept", "application/json");

      assert.equal(
        response.body.error,
        "We didn't have enough information from the artist to start a Stripe session"
      );
      assert.equal(response.statusCode, 500);
    });

    // FIXME: https://github.com/funmusicplace/mirlo/issues/248
    it.skip("should POST / 200", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
        stripeAccountId: "aRandomWord",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/purchase`)
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });
  });
});
