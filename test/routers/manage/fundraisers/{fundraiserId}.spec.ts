import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
  createFundraiser,
} from "../../../utils";
import prisma from "../../../../prisma/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/fundraisers/{fundraiserId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should update fundraiser status to COMPLETE", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser({
        fundraiserStatus: "FUNDING",
        goalAmount: 50000,
      });

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "test-album",
        fundraiserId: fundraiser.id,
      });

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({
          fundraiserStatus: "COMPLETE",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.fundraiserStatus, "COMPLETE");
    });

    it("should update fundraiser goal amount", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser({
        fundraiserStatus: "FUNDING",
        goalAmount: 50000,
      });

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "test-album",
        fundraiserId: fundraiser.id,
      });

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({
          goalAmount: 100000,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.goalAmount, 100000);
    });

    it("should update fundraiser isAllOrNothing flag", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser({
        fundraiserStatus: "FUNDING",
        isAllOrNothing: false,
      });

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "test-album",
        fundraiserId: fundraiser.id,
      });

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({
          isAllOrNothing: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.isAllOrNothing, true);
    });
  });

  describe("GET", () => {
    it("should get fundraiser details", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser({
        fundraiserStatus: "FUNDING",
        goalAmount: 75000,
        name: "My Fundraiser",
      });

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "test-album",
        fundraiserId: fundraiser.id,
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.id, fundraiser.id);
      assert.equal(response.body.result.fundraiserStatus, "FUNDING");
      assert.equal(response.body.result.goalAmount, 75000);
      assert.equal(response.body.result.name, "My Fundraiser");
    });
  });

  describe("DELETE", () => {
    it("should delete a fundraiser", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser({
        fundraiserStatus: "FUNDING",
      });

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "test-album",
        fundraiserId: fundraiser.id,
      });

      const response = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const deletedFundraiser = await prisma.fundraiser.findFirst({
        where: { id: fundraiser.id },
      });

      assert.equal(deletedFundraiser, null);
    });
  });
});
