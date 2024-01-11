import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "../../../prisma/prisma";
import { randomUUID } from "crypto";

import { requestApp } from "../utils";

describe("trackGroups/{id}/download", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("trackGroups/1/download")
        .set("Accept", "application/json");

      assert(response.statusCode === 404);
    });

    it("should GET / 404 when no purchase record found", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / success without logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          pricePaid: 0,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(
          `trackGroups/${trackGroup.id}/download?token=${purchase.singleDownloadToken}&email=${purchaser.email}`
        )
        .set("Accept", "application/json");

      assert.equal(response.header["content-type"], "application/zip");
      assert.equal(
        response.header["content-disposition"],
        `attachment; filename="Test trackGroup"`
      );
      assert.equal(response.statusCode, 200);

      const updatedPurchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: purchase.trackGroupId,
          userId: purchase.trackGroupId,
        },
      });
      assert.equal(updatedPurchase?.singleDownloadToken, null);
    });

    it("should GET / success with logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      const purchase = await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: trackGroup.id,
          pricePaid: 0,
          singleDownloadToken: randomUUID(),
        },
      });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/download`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.header["content-type"], "application/zip");
      assert.equal(
        response.header["content-disposition"],
        `attachment; filename="Test trackGroup"`
      );
      assert.equal(response.statusCode, 200);

      const updatedPurchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: purchase.trackGroupId,
          userId: purchase.trackGroupId,
        },
      });
      assert.equal(updatedPurchase?.singleDownloadToken, null);
    });
  });
});
