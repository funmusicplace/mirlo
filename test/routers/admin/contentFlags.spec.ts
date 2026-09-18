import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createContentFlag,
  createTrackGroup,
  createUser,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("admin/contentFlags", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setupAdminAndFlaggedRelease = async () => {
    const { user: adminUser, accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });
    const artist = await createArtist(artistUser.id);
    const trackGroup = await createTrackGroup(artist.id);
    return { adminUser, accessToken, artist, trackGroup };
  };

  describe("GET /", () => {
    it("should return 401 without user", async () => {
      const response = await requestApp
        .get("admin/contentFlags")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 401 for a non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .get("admin/contentFlags")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should list flags with their artist and release", async () => {
      const { accessToken, artist, trackGroup } =
        await setupAdminAndFlaggedRelease();
      await createContentFlag({
        reason: "copyrightViolation",
        description: "This is not theirs",
        reporterEmail: "reporter@test.com",
        profileId: artist.id,
        trackGroupId: trackGroup.id,
      });

      const response = await requestApp
        .get("admin/contentFlags")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.results.length, 1);
      const flag = response.body.results[0];
      assert.equal(flag.source, "USER_REPORT");
      assert.equal(flag.reason, "copyrightViolation");
      assert.equal(flag.artistId, artist.id);
      assert.equal(flag.artist.name, artist.name);
      assert.equal(flag.trackGroup.id, trackGroup.id);
      assert.equal(flag.resolvedAt, null);
      assert.equal(flag.profileId, undefined);
      assert.equal(flag.profile, undefined);
    });

    it("should filter by resolved state", async () => {
      const { accessToken, adminUser } = await setupAdminAndFlaggedRelease();
      await createContentFlag({});
      await createContentFlag({
        resolvedAt: new Date(),
        resolvedByUserId: adminUser.id,
      });

      const unresolved = await requestApp
        .get("admin/contentFlags?resolved=false")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(unresolved.statusCode, 200);
      assert.equal(unresolved.body.total, 1);
      assert.equal(unresolved.body.results[0].resolvedAt, null);

      const resolved = await requestApp
        .get("admin/contentFlags?resolved=true")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(resolved.statusCode, 200);
      assert.equal(resolved.body.total, 1);
      assert.equal(resolved.body.results[0].resolvedByUser.id, adminUser.id);
    });

    it("should paginate with skip and take", async () => {
      const { accessToken } = await setupAdminAndFlaggedRelease();
      await createContentFlag({});
      await createContentFlag({});
      await createContentFlag({});

      const response = await requestApp
        .get("admin/contentFlags?skip=1&take=1")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.total, 3);
      assert.equal(response.body.results.length, 1);
    });
  });

  describe("GET /unresolvedCount", () => {
    it("should return 401 without user", async () => {
      const response = await requestApp
        .get("admin/contentFlags/unresolvedCount")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should count only unresolved flags", async () => {
      const { accessToken, adminUser } = await setupAdminAndFlaggedRelease();
      await createContentFlag({});
      await createContentFlag({});
      await createContentFlag({
        resolvedAt: new Date(),
        resolvedByUserId: adminUser.id,
      });

      const response = await requestApp
        .get("admin/contentFlags/unresolvedCount")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result, 2);
    });
  });

  describe("PUT /{id}", () => {
    it("should return 401 without user", async () => {
      const flag = await createContentFlag({});

      const response = await requestApp
        .put(`admin/contentFlags/${flag.id}`)
        .send({ resolved: true })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return 400 when resolved is missing", async () => {
      const { accessToken, adminUser } = await setupAdminAndFlaggedRelease();
      const flag = await createContentFlag({
        resolvedAt: new Date(),
        resolvedByUserId: adminUser.id,
      });

      const response = await requestApp
        .put(`admin/contentFlags/${flag.id}`)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const stored = await prisma.contentFlag.findUnique({
        where: { id: flag.id },
      });
      assert.notEqual(stored?.resolvedAt, null);
    });

    it("should return 404 for an unknown flag", async () => {
      const { accessToken } = await setupAdminAndFlaggedRelease();

      const response = await requestApp
        .put("admin/contentFlags/99999")
        .send({ resolved: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should resolve and unresolve a flag", async () => {
      const { accessToken, adminUser } = await setupAdminAndFlaggedRelease();
      const flag = await createContentFlag({
        reporterEmail: "reporter@test.com",
      });

      const resolve = await requestApp
        .put(`admin/contentFlags/${flag.id}`)
        .send({ resolved: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(resolve.statusCode, 200);
      assert.notEqual(resolve.body.result.resolvedAt, null);
      assert.equal(resolve.body.result.resolvedByUser.id, adminUser.id);

      const stored = await prisma.contentFlag.findUnique({
        where: { id: flag.id },
      });
      assert.equal(stored?.resolvedByUserId, adminUser.id);
      assert.equal(stored?.reporterEmail, null);

      const unresolve = await requestApp
        .put(`admin/contentFlags/${flag.id}`)
        .send({ resolved: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(unresolve.statusCode, 200);
      assert.equal(unresolve.body.result.resolvedAt, null);
      assert.equal(unresolve.body.result.resolvedByUser, null);
    });
  });
});
