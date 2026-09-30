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

describe("admin/chargePledges", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setUpFundraiser = async () => {
    const { user: owner } = await createUser({ email: "owner@example.com" });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(owner.id);
    const trackGroup = await createTrackGroup(artist.id);
    const fundraiser = await createFundraiser(trackGroup.id, {
      isAllOrNothing: true,
      goalAmount: 1000,
    });
    const pledge = await createFundraiserPledge(fundraiser.id, backer.id, {
      amount: 5000,
    });
    return { trackGroup, fundraiser, pledge };
  };

  it("refuses to charge anything without a trackGroupId", async () => {
    const { fundraiser, pledge } = await setUpFundraiser();
    const { accessToken } = await createUser({
      email: "admin@example.com",
      isAdmin: true,
    });

    const response = await requestApp
      .post("admin/chargePledges")
      .send({ trackGroupId: "" })
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

  it("refuses to charge pledges for a deleted release", async () => {
    const { trackGroup, fundraiser } = await setUpFundraiser();
    const { accessToken } = await createUser({
      email: "admin@example.com",
      isAdmin: true,
    });
    await prisma.trackGroup.delete({ where: { id: trackGroup.id } });

    const response = await requestApp
      .post("admin/chargePledges")
      .send({ trackGroupId: trackGroup.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);

    const refreshed = await prisma.fundraiser.findUnique({
      where: { id: fundraiser.id },
    });
    assert.equal(refreshed?.status, "ACTIVE");
  });

  it("requires admin", async () => {
    const { trackGroup } = await setUpFundraiser();
    const { accessToken } = await createUser({ email: "nobody@example.com" });

    const response = await requestApp
      .post("admin/chargePledges")
      .send({ trackGroupId: trackGroup.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
  });
});
