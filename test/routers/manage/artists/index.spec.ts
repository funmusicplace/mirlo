import assert from "node:assert";
import prisma from "../../../../prisma/prisma";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createUser } from "../../../utils";

import { requestApp } from "../../utils";
import { getSiteSettings } from "../../../../src/utils/settings";

describe("manage/artists/{artistId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should create an artist", async () => {
      const { accessToken } = await createUser({
        email: "test@testcom",
      });

      const response = await requestApp
        .post(`manage/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          name: "hi",
        });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "hi");
    });
    describe("isClosedToPublicArtistSignup = true", () => {
      it("should not create an artist for logged in user", async () => {
        const settings = await getSiteSettings();
        await prisma.settings.update({
          where: {
            id: settings.id,
          },
          data: {
            isClosedToPublicArtistSignup: true,
          },
        });
        const { accessToken } = await createUser({
          email: "test@testcom",
        });

        const response = await requestApp
          .post(`manage/artists`)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 403);
        assert.equal(
          response.body.error,
          "Your instance administrator needs to invite you to become an artist."
        );
      });

      it("should create an artist if user is invited", async () => {
        const settings = await getSiteSettings();
        const { user: invitedByUser } = await createUser({
          email: "admin@admin.com",
        });
        await prisma.settings.update({
          where: {
            id: settings.id,
          },
          data: {
            isClosedToPublicArtistSignup: true,
          },
        });
        const { user, accessToken } = await createUser({
          email: "test@testcom",
        });

        await prisma.invite.create({
          data: {
            email: "test@test.com",
            usedById: user.id,
            accountType: "ARTIST",
            invitedById: invitedByUser.id,
          },
        });

        const response = await requestApp
          .post(`manage/artists`)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json")
          .send({
            name: "hi",
          });

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.result.name, "hi");
      });
    });
  });
});
