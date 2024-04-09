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
} from "../../../utils";
import prisma from "../../../../prisma/prisma";
import {
  finalCoversBucket,
  minioClient,
  createBucketIfNotExists,
} from "../../../../src/utils/minio";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("users/{userId}/trackGroups/{trackGroupId}/cover", () => {
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
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      await createBucketIfNotExists(minioClient, finalCoversBucket);

      const response = await requestApp
        .delete(`users/${user.id}/trackGroups/${trackGroup.id}/cover`)
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
