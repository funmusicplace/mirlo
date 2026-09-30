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
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/fundraisers/{fundraiserId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    const setUp = async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { user: backer } = await createUser({
        email: "backer@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });
      return { accessToken, backer, fundraiser };
    };

    it("refuses to change isAllOrNothing while there are open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ isAllOrNothing: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const refreshed = await prisma.fundraiser.findUnique({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed?.isAllOrNothing, true);
    });

    it("still allows other edits while there are open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ name: "New name", isAllOrNothing: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "New name");
    });

    it("allows changing isAllOrNothing when all pledges are cancelled", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id, {
        cancelledAt: new Date(),
      });

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ isAllOrNothing: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const refreshed = await prisma.fundraiser.findUnique({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed?.isAllOrNothing, false);
    });
  });
});
