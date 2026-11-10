import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createFundraiser,
  createFundraiserPledge,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("fundraisers/{id}/changePledge", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setUp = async (
    fundraiserData: Parameters<typeof createFundraiser>[1] = {}
  ) => {
    const { user: artistUser } = await createUser({
      email: "artist@example.com",
    });
    const { user: backer, accessToken } = await createUser({
      email: "backer@example.com",
    });
    const artist = await createArtist(artistUser.id);
    const fundraiser = await createFundraiser(artist.id, {
      isAllOrNothing: true,
      ...fundraiserData,
    });
    return { artist, backer, accessToken, fundraiser };
  };

  const changePledge = (fundraiserId: number, amount: number, jwt: string) =>
    requestApp
      .put(`fundraisers/${fundraiserId}/changePledge`)
      .send({ amount })
      .set("Cookie", [`jwt=${jwt}`])
      .set("Accept", "application/json");

  describe("PUT", () => {
    it("changes the amount of a pledge to a fundraiser with no release", async () => {
      const { backer, accessToken, fundraiser } = await setUp({
        minPledge: 500,
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await changePledge(fundraiser.id, 700, accessToken);

      assert.equal(response.statusCode, 200);
      const refreshed = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(refreshed.amount, 700);
    });

    it("uses the fundraiser's minimum pledge, not the release's price", async () => {
      const { artist, backer, accessToken, fundraiser } = await setUp({
        minPledge: 2000,
      });
      const trackGroup = await createTrackGroup(artist.id, { minPrice: 100 });
      await prisma.trackGroup.update({
        where: { id: trackGroup.id },
        data: { fundraiserId: fundraiser.id },
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await changePledge(fundraiser.id, 1000, accessToken);

      assert.equal(response.statusCode, 400);
      const refreshed = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(refreshed.amount, pledge.amount);
    });

    it("refuses an amount below Stripe's minimum charge", async () => {
      const { artist, backer, accessToken, fundraiser } = await setUp({
        minPledge: 0,
      });
      await prisma.user.update({
        where: { id: artist.userId },
        data: { currency: "eur" },
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await changePledge(fundraiser.id, 40, accessToken);

      assert.equal(response.statusCode, 400);
      const refreshed = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(refreshed.amount, pledge.amount);
    });

    it("refuses to change a pledge that was already charged", async () => {
      const { backer, accessToken, fundraiser } = await setUp();
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id, {
        paidAt: new Date(),
      });

      const response = await changePledge(fundraiser.id, 9000, accessToken);

      assert.equal(response.statusCode, 404);
      const refreshed = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(refreshed.amount, pledge.amount);
    });

    it("refuses to change a pledge once the fundraiser has closed", async () => {
      const { backer, accessToken, fundraiser } = await setUp({
        status: "FAILED",
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await changePledge(fundraiser.id, 9000, accessToken);

      assert.equal(response.statusCode, 400);
      const refreshed = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(refreshed.amount, pledge.amount);
    });
  });

  describe("DELETE", () => {
    it("doesn't cancel a pledge that was already charged", async () => {
      const { backer, accessToken, fundraiser } = await setUp();
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id, {
        paidAt: new Date(),
      });

      const response = await requestApp
        .delete(`fundraisers/${fundraiser.id}/changePledge`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const refreshed = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(refreshed.cancelledAt, null);
    });
  });
});
