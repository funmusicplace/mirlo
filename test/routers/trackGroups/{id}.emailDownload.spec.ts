import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("trackGroups/{id}/emailDownload", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setup = async (data?: Parameters<typeof createTrackGroup>[1]) => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id, data);
    const { user: fan, accessToken } = await createUser({
      email: "fan@artist.com",
    });
    const response = await requestApp
      .post(`trackGroups/${trackGroup.id}/emailDownload`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");
    const purchases = await prisma.userTrackGroupPurchase.count({
      where: { userId: fan.id, trackGroupId: trackGroup.id },
    });
    return { response, purchases };
  };

  it("should give a free published release", async () => {
    const { response, purchases } = await setup();
    assert.equal(response.statusCode, 200);
    assert.equal(purchases, 1);
  });

  it("should not give an unpublished release", async () => {
    const { response, purchases } = await setup({ publishedAt: null });
    assert.equal(response.statusCode, 404);
    assert.equal(purchases, 0);
  });

  it("should not give a scheduled release", async () => {
    const { response, purchases } = await setup({
      publishedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    assert.equal(response.statusCode, 404);
    assert.equal(purchases, 0);
  });

  it("should not give a subscriber-only release", async () => {
    const { response, purchases } = await setup({ isGettable: false });
    assert.equal(response.statusCode, 404);
    assert.equal(purchases, 0);
  });
});
