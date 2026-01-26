import assert from "node:assert";
import * as dotenv from "dotenv";
import { Request, Response } from "express";

dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";
import sinon from "sinon";

import { requestApp } from "./utils";
import prisma from "@mirlo/prisma";
import checkoutEndpoint from "../../src/routers/v1/checkout";
import * as stripeUtils from "../../src/utils/stripe";
import Stripe from "stripe";

describe("checkout", () => {
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

  describe("GET", () => {
    it("should GET / 400 when no session_id or stripeAccountId sent", async () => {
      const response = await requestApp
        .get("checkout")
        .set("Accept", "application/json");
      assert.equal(
        response.body.error,
        "need session_id and stripeAccountId in query"
      );
      assert.equal(response.statusCode, 400);
    });

    describe("endpoint as function", () => {
      it("should correctly get data from stripe after a checkout session", async () => {
        const client = await prisma.client.create({
          data: {
            applicationName: "test client",
            applicationUrl: "https://localhost:3333",
          },
        });

        const { user } = await createUser({
          email: "artist@artist.com",
          stripeAccountId: "aRandomWord",
        });
        const artist = await createArtist(user.id);
        const trackGroup = await createTrackGroup(artist.id, {
          stripeProductKey: "testProductKey",
        });

        const stubRetrieve = sinon
          .stub(stripeUtils.stripe.checkout.sessions, "retrieve")
          .resolves({
            metadata: {
              clientId: `${client.id}`,
              artistId: `${artist.id}`,
              trackGroupId: `${trackGroup.id}`,
              purchaseType: "trackGroup",
            },
          } as unknown as Stripe.Response<Stripe.Checkout.Session>);

        const mockRedirect = sinon.stub();

        const sessionId = "session124";
        const stripeAccountId = "account1234";

        await checkoutEndpoint().GET[0](
          {
            query: {
              success: true,
              session_id: sessionId,
              stripeAccountId: stripeAccountId,
            },
          } as unknown as Request,
          {
            status: () => {
              return {
                json: (obj: unknown) => {},
              };
            },
            redirect: mockRedirect,
          } as unknown as Response,
          () => {}
        );

        assert.equal(stubRetrieve.calledOnce, true);
        const args = stubRetrieve.getCall(0).args;
        assert.equal(args[0], sessionId);
        assert.deepEqual(args[1], { stripeAccount: stripeAccountId });
        assert.equal(mockRedirect.calledOnce, true);
        assert.equal(
          mockRedirect.getCall(0).args[0],
          `${client.applicationUrl}/${artist.urlSlug}/checkout-complete?purchaseType=trackGroup&trackGroupId=${trackGroup.id}`
        );
      });
    });
  });
});
