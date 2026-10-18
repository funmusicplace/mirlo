import assert from "node:assert";

import * as dotenv from "dotenv";

import prisma from "../../../../prisma/prisma";

dotenv.config();
import { describe, it } from "mocha";

import { getSiteSettings } from "../../../../src/utils/settings";
import { clearTables, createProfile, createUser } from "../../../utils";
import { requestApp } from "../../utils";

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

    it("should suffix the generated urlSlug when the name is already taken", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      await createProfile(user.id, { name: "Glo Waves" });

      const response = await requestApp
        .post(`manage/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ name: "Glo Waves" });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.urlSlug, "glo-waves-2");
    });

    it("should reject an explicit urlSlug that is already taken", async () => {
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      await createProfile(otherUser.id, { urlSlug: "taken" });
      const { accessToken } = await createUser({
        email: "test@testcom",
      });

      const response = await requestApp
        .post(`manage/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ name: "hi", urlSlug: "Taken" });

      assert.equal(response.statusCode, 400);
      assert.equal(await prisma.profile.count(), 1);
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
          canCreateArtists: false,
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

      it("should create an artist if user canCreateArtists", async () => {
        const settings = await getSiteSettings();

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
          canCreateArtists: true,
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
