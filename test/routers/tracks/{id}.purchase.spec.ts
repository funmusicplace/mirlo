import assert from "node:assert";
import * as dotenv from "dotenv";
import { Request, Response } from "express";

dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
} from "../../utils";
import sinon from "sinon";

import { requestApp } from "../utils";
import prisma from "@mirlo/prisma";
import purchaseTrackEndpoint from "../../../src/routers/v1/tracks/{id}/purchase";
import * as stripeUtils from "../../../src/utils/stripe";

describe("tracks/{id}/purchase", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("POST", () => {
    it("should POST / 404", async () => {
      const response = await requestApp
        .post("trackGroups/1/purchase")
        .send({})
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should POST / 400 if the price sent is less than the track price", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const track = await createTrack(trackGroup.id, { minPrice: 500 });

      const response = await requestApp
        .post(`tracks/${track.id}/purchase`)
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
      const track = await createTrack(trackGroup.id);

      const response = await requestApp
        .post(`tracks/${track.id}/purchase`)
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
      const track = await createTrack(trackGroup.id);

      const response = await requestApp
        .post(`tracks/${track.id}/purchase`)
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
      const purchase = await prisma.userTrackPurchase.findFirst({
        where: {
          userId: purchaser.id,
          trackId: track.id,
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
      const track = await createTrack(trackGroup.id);

      const response = await requestApp
        .post(`tracks/${track.id}/purchase`)
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

    describe("endpoint as function", () => {
      it("should correctly send data to stripe for a checkout session", async () => {
        const stubCreate = sinon.stub(
          stripeUtils.stripe.checkout.sessions,
          "create"
        );
        sinon
          .stub(stripeUtils.stripe.products, "retrieve")
          // @ts-ignore
          .callsFake(async (_params) => {
            return "testProductKey";
          });

        const { user } = await createUser({
          email: "artist@artist.com",
          stripeAccountId: "aRandomWord",
        });
        const artist = await createArtist(user.id);
        const trackGroup = await createTrackGroup(artist.id);
        const track = await createTrack(trackGroup.id, {
          stripeProductKey: "testProductKey",
        });

        await purchaseTrackEndpoint().POST[1](
          {
            body: { price: 15 },
            params: { id: track.id },
          } as unknown as Request,
          {} as Response,
          () => {}
        );

        assert.equal(stubCreate.calledOnce, true);
        const args = stubCreate.getCall(0).args as any; // Something wrong with how types get generated for the stub
        assert.equal(args[0]?.metadata?.artistId, artist.id);
        assert.equal(args[0]?.metadata?.trackId, track.id);
        assert.equal(args[0]?.metadata?.stripeAccountId, user.stripeAccountId);
        assert.equal(args[0]?.line_items?.[0].quantity, 1);
        assert.equal(
          args[0]?.line_items?.[0].price_data?.product,
          track.stripeProductKey
        );
      });

      it("should use the stripe account of the paymentUser", async () => {
        const stubCreate = sinon.stub(
          stripeUtils.stripe.checkout.sessions,
          "create"
        );
        sinon
          .stub(stripeUtils.stripe.products, "retrieve")
          // @ts-ignore
          .callsFake(async (_params) => {
            // return whatever
          });

        const { user: artistUser } = await createUser({
          email: "artist@artist.com",
          stripeAccountId: "aRandomWord",
        });
        const { user: labelUser } = await createUser({
          email: "label@label.com",
          stripeAccountId: "labelAccountId",
        });
        const artist = await createArtist(artistUser.id);
        const trackGroup = await createTrackGroup(artist.id, {
          paymentToUserId: labelUser.id,
        });
        const track = await createTrack(trackGroup.id, {
          stripeProductKey: "testProductKey",
        });

        await purchaseTrackEndpoint().POST[1](
          {
            body: { price: 15 },
            params: { id: track.id },
          } as unknown as Request,
          {} as Response,
          () => {}
        );

        assert.equal(stubCreate.calledOnce, true);
        const args = stubCreate.getCall(0).args as any; // FIXME somethin wrong with how types get passed to the stub
        assert.equal(args[0]?.metadata?.artistId, artist.id);
        assert.equal(args[0]?.metadata?.trackId, track.id);
        assert.equal(
          args[0]?.metadata?.stripeAccountId,
          labelUser.stripeAccountId
        );
        assert.equal(args[0]?.line_items?.[0].quantity, 1);
        assert.equal(
          args[0].line_items?.[0].price_data?.product,
          track.stripeProductKey
        );
      });
    });
  });
});
