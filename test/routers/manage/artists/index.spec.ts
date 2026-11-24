import assert from "node:assert";

import * as dotenv from "dotenv";

import prisma from "../../../../prisma/prisma";

dotenv.config();
import { describe, it } from "mocha";

import { getSiteSettings } from "../../../../src/utils/settings";
import {
  clearTables,
  createArtistLabel,
  createProfile,
  createUser,
} from "../../../utils";
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

    it("should create an artist with the catalogue purchase turned off", async () => {
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
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { id: response.body.result.id },
      });
      assert.equal(profile.purchaseEntireCatalogEnabled, false);
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

    it("should reject a reserved urlSlug in any case", async () => {
      const { accessToken } = await createUser({
        email: "test@testcom",
      });

      const response = await requestApp
        .post(`manage/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ name: "hi", urlSlug: "OAuth" });

      assert.equal(response.statusCode, 400);
      assert.equal(await prisma.profile.count(), 0);
    });

    it("should suffix a generated urlSlug that is reserved", async () => {
      const { accessToken } = await createUser({
        email: "test@testcom",
      });

      const response = await requestApp
        .post(`manage/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ name: "Login" });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.urlSlug, "login-2");
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

  describe("GET", () => {
    const setup = async () => {
      const { user, accessToken } = await createUser({
        email: "label@testcom",
      });
      const own = await createProfile(user.id, { name: "Own" });
      const { user: artistUser } = await createUser({
        email: "artist@testcom",
      });
      const roster = await createProfile(artistUser.id, { name: "Roster" });
      const rosterNotManaged = await createProfile(artistUser.id, {
        name: "Roster not managed",
      });
      const managed = await createProfile(artistUser.id, { name: "Managed" });
      await createArtistLabel({
        artistId: roster.id,
        labelUserId: user.id,
        canLabelManageArtist: true,
      });
      await createArtistLabel({
        artistId: rosterNotManaged.id,
        labelUserId: user.id,
        canLabelManageArtist: false,
      });
      await createArtistLabel({
        artistId: managed.id,
        labelUserId: user.id,
        canLabelManageArtist: true,
      });
      await prisma.profileManager.create({
        data: {
          profileId: managed.id,
          userId: user.id,
          invitedById: artistUser.id,
          acceptedAt: new Date(),
        },
      });
      const get = (query = "") =>
        requestApp
          .get(`manage/artists${query}`)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");
      return { own, roster, managed, get };
    };

    it("returns only the owned and managed profiles by default", async () => {
      const { own, managed, get } = await setup();
      const response = await get();
      assert.equal(response.statusCode, 200);
      assert.deepEqual(
        response.body.results
          .map((p: { id: number; relationship: string }) => [
            p.id,
            p.relationship,
          ])
          .sort(),
        [
          [own.id, "owner"],
          [managed.id, "manager"],
        ].sort()
      );
    });

    it("adds the label roster artists the label can manage with includeLabelArtists, without exposing managers", async () => {
      const { own, roster, managed, get } = await setup();
      const response = await get("?includeLabelArtists=true");
      assert.equal(response.statusCode, 200);
      assert.deepEqual(
        response.body.results
          .map((p: { id: number; relationship: string }) => [
            p.id,
            p.relationship,
          ])
          .sort(),
        [
          [own.id, "owner"],
          [roster.id, "label"],
          [managed.id, "manager"],
        ].sort()
      );
      assert.ok(
        response.body.results.every(
          (p: Record<string, unknown>) => p.managers === undefined
        )
      );
    });
  });
});
