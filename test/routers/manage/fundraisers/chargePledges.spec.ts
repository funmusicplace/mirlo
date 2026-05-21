import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createFundraiser,
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
      isAllOrNothing: true,
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
