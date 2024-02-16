import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";
import prisma from "../../../../prisma/prisma";

import { requestApp } from "../../utils";

describe("users/{userId}/artists/{artistId}/codes", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should get json", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      await prisma.trackGroupDownloadCodes.createMany({
        data: [
          {
            downloadCode: "random",
            trackGroupId: trackGroup.id,
            group: "code",
          },
        ],
      });

      const codes = await prisma.trackGroupDownloadCodes.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
      });

      const response = await requestApp
        .get(`users/${user.id}/artists/${artist.id}/codes`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 200);
      assert.deepEqual(
        response.body.results[0].downloadCode,
        codes[0].downloadCode
      );
    });

    it("should get csv", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      await prisma.artistAvatar.create({
        data: {
          artistId: artist.id,
        },
      });

      const trackGroup = await createTrackGroup(artist.id);
      await prisma.trackGroupDownloadCodes.createMany({
        data: [
          {
            downloadCode: "random",
            trackGroupId: trackGroup.id,
            group: "code",
          },
        ],
      });

      const codes = await prisma.trackGroupDownloadCodes.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
      });

      const response = await requestApp
        .get(`users/${user.id}/artists/${artist.id}/codes?format=csv`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.header["content-type"], "text/csv; charset=utf-8");
      assert.equal(response.text.split(",")[0], '"Album ID"');
      const rows = response.text.split("\n");
      assert.equal(rows[1].split(",")[0], codes[0].trackGroupId);
      assert.equal(
        rows[1].split(",")[6].replaceAll('"', ""),
        `${process.env.REACT_APP_CLIENT_DOMAIN}/${artist.urlSlug}/release/${trackGroup.urlSlug}/redeem?code=${codes[0].downloadCode}`
      );
    });
  });
});
