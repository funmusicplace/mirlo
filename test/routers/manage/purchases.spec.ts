import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { NextFunction, Request, Response } from "express";
import { describe, it, beforeEach, afterEach, after } from "mocha";
import prisma from "@mirlo/prisma";
import sinon from "sinon";

import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../../src/queues/send-mail-queue";
import purchaseEndpoint from "../../../src/routers/v1/manage/purchases/{purchaseId}/index";
import {
  clearTables,
  createUser,
  createArtist,
  createMerch,
  createArtistLabel,
} from "../../utils";
import { requestApp } from "../utils";

describe("manage/purchases", () => {
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

  after(async () => {
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  describe("GET /", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await requestApp
        .get("manage/purchases")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return purchases for artists owned by the user", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
        password: "super-secret-password",
      });

      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get("manage/purchases")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.email, "buyer@test.com");
      assert.equal(response.body.results[0].user.id, buyer.user.id);
      assert.equal(response.body.results[0].user.password, undefined);
      assert.equal(
        response.body.results[0].user.emailConfirmationToken,
        undefined
      );
      assert.equal(
        response.body.results[0].user.passwordResetConfirmationToken,
        undefined
      );
    });

    it("should not return purchases for artists not owned or managed by the user", async () => {
      const owner = await createUser({ email: "owner@test.com" });
      const attacker = await createUser({ email: "attacker@test.com" });
      const buyer = await createUser({
        email: "buyer@test.com",
        password: "super-secret-password",
      });

      const artist = await createArtist(owner.user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases?artistIds=${artist.id}`)
        .set("Cookie", [`jwt=${attacker.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
      assert.equal(response.body.total, 0);
    });

    it("should not return purchases for artists a user can manage but doesn't own when artist ids are not provided", async () => {
      const label = await createUser({
        email: "label@test.com",
        isLabelAccount: true,
      });
      const owner = await createUser({ email: "owner@test.com" });
      const buyer = await createUser({ email: "buyer@test.com" });

      const artist = await createArtist(owner.user.id);
      await createArtistLabel({
        artistId: artist.id,
        labelUserId: label.user.id,
        canLabelManageArtist: true,
        isLabelApproved: true,
        isArtistApproved: true,
      });

      const merch = await createMerch(artist.id);
      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 900,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get("manage/purchases")
        .set("Cookie", [`jwt=${label.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("should return purchases for artists a user can manage but doesn't own when artist ids are provided", async () => {
      const label = await createUser({
        email: "label@test.com",
        isLabelAccount: true,
      });
      const owner = await createUser({ email: "owner@test.com" });
      const buyer = await createUser({ email: "buyer@test.com" });

      const artist = await createArtist(owner.user.id);
      await createArtistLabel({
        artistId: artist.id,
        labelUserId: label.user.id,
        canLabelManageArtist: true,
        isLabelApproved: true,
        isArtistApproved: true,
      });

      const merch = await createMerch(artist.id);
      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 900,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases?artistIds=${artist.id}`)
        .set("Cookie", [`jwt=${label.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.email, "buyer@test.com");
      assert.equal(response.body.results[0].user.password, undefined);
    });
  });

  describe("GET /:purchaseId", () => {
    it("should not leak buyer secrets on a single purchase", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
        password: "super-secret-password",
      });

      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      const purchase = await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases/${purchase.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.user.email, "buyer@test.com");
      assert.equal(response.body.result.user.password, undefined);
      assert.equal(response.body.result.user.emailConfirmationToken, undefined);
    });

    it("should 404 for another artist's purchase", async () => {
      const owner = await createUser({ email: "owner@test.com" });
      const attacker = await createUser({ email: "attacker@test.com" });
      const buyer = await createUser({ email: "buyer@test.com" });

      const artist = await createArtist(owner.user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      const purchase = await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases/${purchase.id}`)
        .set("Cookie", [`jwt=${attacker.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
  });

  describe("PUT /:purchaseId", () => {
    const setupPurchase = async (
      data: {
        fulfillmentStatus?: "NO_PROGRESS" | "STARTED" | "SHIPPED" | "COMPLETED";
        trackingNumber?: string | null;
        trackingWebsite?: string | null;
      } = {}
    ) => {
      const artistUser = await createUser({ email: "artist@test.com" });
      const buyer = await createUser({
        email: "buyer@test.com",
        name: "Buyer Person",
      });
      const artist = await createArtist(artistUser.user.id, {
        name: "Shipping Artist",
        urlSlug: "shipping-artist",
      });
      const merch = await createMerch(artist.id, { title: "Tour Shirt" });
      const purchase = await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: data.fulfillmentStatus ?? "NO_PROGRESS",
          trackingNumber: data.trackingNumber,
          trackingWebsite: data.trackingWebsite,
        },
      });
      return { artistUser, buyer, artist, merch, purchase };
    };

    const callPut = async (
      user: unknown,
      purchaseId: string,
      body: Record<string, unknown>
    ) => {
      const res = {
        json: sinon.stub().returnsThis(),
        status: sinon.stub().returnsThis(),
      };
      const next = sinon.stub();
      const operations = purchaseEndpoint();
      const put = operations.PUT[operations.PUT.length - 1];
      await put(
        { user, params: { purchaseId }, body } as unknown as Request,
        res as unknown as Response,
        next as unknown as NextFunction
      );
      return { res, next };
    };

    it("should update fulfillment info over HTTP", async () => {
      const { artistUser, purchase } = await setupPurchase();

      const response = await requestApp
        .put(`manage/purchases/${purchase.id}`)
        .send({
          fulfillmentStatus: "SHIPPED",
          trackingNumber: "1Z999",
          trackingWebsite: "https://tracking.example.com/1Z999",
        })
        .set("Cookie", [`jwt=${artistUser.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.fulfillmentStatus, "SHIPPED");
      assert.equal(response.body.result.trackingNumber, "1Z999");

      const stored = await prisma.merchPurchase.findFirst({
        where: { id: purchase.id },
      });
      assert.equal(stored?.fulfillmentStatus, "SHIPPED");
      assert.equal(
        stored?.trackingWebsite,
        "https://tracking.example.com/1Z999"
      );
    });

    it("should 404 when updating another artist's purchase", async () => {
      const { purchase } = await setupPurchase();
      const attacker = await createUser({ email: "attacker@test.com" });

      const response = await requestApp
        .put(`manage/purchases/${purchase.id}`)
        .send({ fulfillmentStatus: "SHIPPED" })
        .set("Cookie", [`jwt=${attacker.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should email the buyer when the fulfillment status changes", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves(undefined as any);
      const { artistUser, buyer, purchase } = await setupPurchase();

      const { next } = await callPut(artistUser.user, purchase.id, {
        fulfillmentStatus: "SHIPPED",
        trackingNumber: "1Z999",
        trackingWebsite: "tracking.example.com/1Z999",
      });

      assert.equal(next.called, false);
      assert.equal(stub.calledOnce, true);
      const [queueName, emailData] = stub.getCall(0).args;
      assert.equal(queueName, "send-mail");
      assert.equal(emailData.template, "merch-shipment-update");
      assert.equal(emailData.message.to, buyer.user.email);
      assert.equal(emailData.locals.artistName, "Shipping Artist");
      assert.equal(emailData.locals.merchTitle, "Tour Shirt");
      assert.equal(emailData.locals.fulfillmentStatus, "SHIPPED");
      assert.equal(emailData.locals.statusLabel, "Shipped");
      assert.equal(emailData.locals.trackingNumber, "1Z999");
      assert.equal(
        emailData.locals.trackingUrl,
        "https://tracking.example.com/1Z999"
      );
    });

    it("should email the buyer when tracking info is added without a status change", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves(undefined as any);
      const { artistUser, purchase } = await setupPurchase({
        fulfillmentStatus: "SHIPPED",
      });

      await callPut(artistUser.user, purchase.id, {
        fulfillmentStatus: "SHIPPED",
        trackingNumber: "ABC123",
        trackingWebsite: "",
      });

      assert.equal(stub.calledOnce, true);
      const emailData = stub.getCall(0).args[1];
      assert.equal(emailData.locals.trackingNumber, "ABC123");
      assert.equal(emailData.locals.trackingUrl, null);
    });

    it("should not email the buyer when nothing changed", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves(undefined as any);
      const { artistUser, purchase } = await setupPurchase({
        fulfillmentStatus: "SHIPPED",
        trackingNumber: "ABC123",
        trackingWebsite: null,
      });

      const { res, next } = await callPut(artistUser.user, purchase.id, {
        fulfillmentStatus: "SHIPPED",
        trackingNumber: "ABC123",
        // The fulfillment form submits "" for an empty input
        trackingWebsite: "",
      });

      assert.equal(next.called, false);
      assert.equal(res.json.calledOnce, true);
      assert.equal(stub.called, false);
    });
  });
});
