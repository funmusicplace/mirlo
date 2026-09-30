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

describe("manage/fundraisers/{fundraiserId}/chargePledges", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("marks the fundraiser SUCCESSFUL even when there are no pledges to charge (#1681)", async () => {
    const { user, accessToken } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.id, {
      isAllOrNothing: false,
    });

    assert.equal(fundraiser.status, "ACTIVE");

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "SUCCESSFUL");
  });

  it("refuses to charge an all-or-nothing fundraiser below its goal", async () => {
    const { user, accessToken } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.id, {
      isAllOrNothing: true,
      goalAmount: 50000,
    });
    const pledge = await createFundraiserPledge(fundraiser.id, backer.id, {
      amount: 5000,
    });

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "ACTIVE");
    const refreshedPledge = await prisma.fundraiserPledge.findUnique({
      where: { id: pledge.id },
    });
    assert.equal(refreshedPledge?.paidAt, null);
  });

  it("refuses to charge a fundraiser that is no longer active", async () => {
    const { user, accessToken } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.id, {
      status: "SUCCESSFUL",
    });

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("rejects requests from other artists", async () => {
    const { user: owner } = await createUser({
      email: "fundraiser-owner@example.com",
    });
    const { accessToken: otherToken } = await createUser({
      email: "other@example.com",
    });
    const artist = await createArtist(owner.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.id);

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/chargePledges`)
      .send({})
      .set("Cookie", [`jwt=${otherToken}`])
      .set("Accept", "application/json");

    assert.notEqual(response.statusCode, 200);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "ACTIVE");
  });
});
