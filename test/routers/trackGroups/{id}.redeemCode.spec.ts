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

import { requestApp } from "../utils";

describe("trackGroups/{id}/redeemCode", () => {
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
        .get("trackGroups/1/redeemCode")
        .set("Accept", "application/json");

      assert(response.statusCode === 404);
    });

    it("should GET / 404 when no code found", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/redeemCode`)
        .send({})
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(response.body.error, "Code not found");
    });

    it("should GET / fail without an email or logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      const code = await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/redeemCode`)
        .send({
          code: "asdf",
        })
        .set("Accept", "application/json");

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 400);

      assert.equal(
        response.body.error,
        "Need to be either logged in or supply email address"
      );
    });

    it("should GET / succeed with an email", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });

      await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/redeemCode`)
        .send({
          code: "asdf",
          email: purchaser.email,
        })
        .set("Accept", "application/json");

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);

      assert.equal(response.body.user.email, purchaser.email);

      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          userId: purchaser.id,
        },
      });

      assert.equal(purchase?.trackGroupId, trackGroup.id);

      const artistNotification = await prisma.notification.findFirst({
        where: {
          userId: user.id,
        },
      });

      assert.equal(
        artistNotification?.notificationType,
        "USER_BOUGHT_YOUR_ALBUM"
      );
      assert.equal(artistNotification?.relatedUserId, purchaser.id);
    });

    it("should GET / succeed with a logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      const code = await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/redeemCode`)
        .send({
          code: "asdf",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          userId: purchaser.id,
        },
      });

      assert.equal(purchase?.trackGroupId, trackGroup.id);
      assert.equal(response.body.user.email, purchaser.email);
    });

    it("should GET / succeed with a logged in user", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      const code = await prisma.trackGroupDownloadCodes.create({
        data: {
          trackGroupId: trackGroup.id,
          downloadCode: "asdf",
          group: "press",
        },
      });

      const response = await requestApp
        .post(`trackGroups/${trackGroup.id}/redeemCode`)
        .send({
          code: "asdf",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(
        response.header["content-type"],
        "application/json; charset=utf-8"
      );
      assert.equal(response.statusCode, 200);
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          userId: purchaser.id,
        },
      });

      assert.equal(purchase?.trackGroupId, trackGroup.id);
      assert.equal(response.body.user.email, purchaser.email);
    });
  });
});
