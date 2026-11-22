import assert from "node:assert";

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

describe("trackGroups/{id}/emailPurchaseLink", () => {
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
    const { accessToken } = await createUser({ email: "fan@artist.com" });
    return requestApp
      .post(`trackGroups/${trackGroup.id}/emailPurchaseLink`)
      .query({ email: "stranger@example.com" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");
  };

  it("should send for a published release", async () => {
    const response = await setup();
    assert.equal(response.statusCode, 200);
  });

  it("should not send for an unpublished release", async () => {
    const response = await setup({ publishedAt: null });
    assert.equal(response.statusCode, 404);
  });

  it("should not send for a scheduled release", async () => {
    const response = await setup({
      publishedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    assert.equal(response.statusCode, 404);
  });

  it("should require a signed-in user", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id);
    const response = await requestApp
      .post(`trackGroups/${trackGroup.id}/emailPurchaseLink`)
      .query({ email: "stranger@example.com" })
      .set("Accept", "application/json");
    assert.equal(response.statusCode, 401);
  });
});
