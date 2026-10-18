import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  getImagesBucket,
  createBucketIfNotExists,
} from "../../../../src/utils/minio";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../../utils";

import prisma from "@mirlo/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/trackGroups/{trackGroupId}/cover", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("DELETE", () => {
    it("should DELETE with one trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      await createBucketIfNotExists(getImagesBucket());

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/cover`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const foundOld = await prisma.trackGroupCover.findFirst({
        where: { trackGroupId: trackGroup.id },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(foundOld, null);

      // TODO: make sure image folder was deleted
    });
  });
});
