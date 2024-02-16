import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTier,
  createTrackGroup,
  createUser,
} from "../../../utils";
import prisma from "../../../../prisma/prisma";

import { requestApp } from "../../utils";
import { range } from "lodash";

describe("users/{userId}/trackGroups/{trackGroupId}/codes", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should upload new subscriptions", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`users/${user.id}/trackGroups/${trackGroup.id}/codes`)
        .send([
          {
            group: "Test group",
            quantity: 200,
          },
        ])
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const created = await prisma.trackGroupDownloadCodes.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
      });

      assert.equal(created.length, 200);
      assert.deepEqual(
        created.map((c) => c.group),
        range(200).map((i) => "Test group")
      );
      assert.notEqual(created, null);
      assert(created);
    });
  });
});
