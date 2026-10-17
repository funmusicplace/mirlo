import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";
import request from "supertest";

import { clearTables, createUser } from "../utils";

const baseURL = `${process.env.API_DOMAIN}/`;
const requestApp = request(baseURL);

const webfingerDomain = new URL(
  process.env.API_DOMAIN || "http://localhost:3000"
).hostname;

describe(".well-known/webfinger", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should return webfinger data for an ActivityPub artist", async () => {
    const { user } = await createUser({
      email: "test@test.com",
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
        activityPub: true,
      },
    });

    const response = await requestApp
      .get(".well-known/webfinger")
      .query({
        resource: `acct:${artist.urlSlug}@${webfingerDomain}`,
      })
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.body.subject,
      `acct:${artist.urlSlug}@${webfingerDomain}`
    );
    assert.equal(response.body.aliases?.length, 1);
    assert(
      response.body.aliases[0].endsWith(`/v1/ap/artists/${artist.urlSlug}`)
    );

    const selfLink = response.body.links?.find(
      (link: { rel?: string }) => link.rel === "self"
    );
    assert(selfLink);
    assert.equal(selfLink.type, "application/activity+json");
    assert(selfLink.href.endsWith(`/v1/ap/artists/${artist.urlSlug}`));
  });

  it("should return 404 when artist is not ActivityPub enabled", async () => {
    const { user } = await createUser({
      email: "test@test.com",
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
        activityPub: false,
      },
    });

    const response = await requestApp
      .get(".well-known/webfinger")
      .query({
        resource: `acct:${artist.urlSlug}@${webfingerDomain}`,
      })
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should return 400 for malformed acct resources", async () => {
    const response = await requestApp
      .get(".well-known/webfinger")
      .query({
        resource: "team@test.com",
      })
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("should return 404 for acct resources targeting another domain", async () => {
    const { user } = await createUser({
      email: "test@test.com",
    });

    await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
        activityPub: true,
      },
    });

    const response = await requestApp
      .get(".well-known/webfinger")
      .query({
        resource: "acct:test-artist@example.com",
      })
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });
});

describe("nodeinfo", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should link to the nodeinfo document from .well-known", async () => {
    const response = await requestApp
      .get(".well-known/nodeinfo")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const link = response.body.links?.find((l: { rel?: string }) =>
      l.rel?.startsWith("http://nodeinfo.diaspora.software/ns/schema/")
    );
    assert(link?.href.endsWith("/nodeinfo/2.1"));
  });

  it("should describe the instance with ActivityPub artist counts", async () => {
    const { user } = await createUser({
      email: "test@test.com",
    });

    await prisma.profile.create({
      data: {
        name: "AP artist",
        urlSlug: "ap-artist",
        userId: user.id,
        enabled: true,
        activityPub: true,
      },
    });
    await prisma.profile.create({
      data: {
        name: "Non-AP artist",
        urlSlug: "non-ap-artist",
        userId: user.id,
        enabled: true,
        activityPub: false,
      },
    });

    const response = await requestApp
      .get("nodeinfo/2.1")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.software.name, "mirlo");
    assert.deepEqual(response.body.protocols, ["activitypub"]);
    assert.equal(response.body.usage.users.total, 1);
  });
});
