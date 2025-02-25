import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createUser } from "../../../utils";
import prisma from "@mirlo/prisma";
import {
  createBucketIfNotExists,
  finalArtistBannerBucket,
} from "../../../../src/utils/minio";

import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/banner", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("DELETE", () => {
    it("should DELETE with one artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createBucketIfNotExists(finalArtistBannerBucket);

      await prisma.artistBanner.create({
        data: {
          artistId: artist.id,
        },
      });

      const response = await requestApp
        .delete(`manage/artists/${artist.id}/banner`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const foundOld = await prisma.artistBanner.findFirst({
        where: { artistId: artist.id },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(foundOld, null);

      // TODO: make sure image folder was deleted
    });
  });
});
