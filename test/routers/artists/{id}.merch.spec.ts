import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createMerch,
  createMerchShippingDestination,
  createProfile,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("artists/{id}/merch", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404 for an unknown artist", async () => {
    const response = await requestApp
      .get("artists/1/merch")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / 404 when the artist is disabled", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id, { enabled: false });
    await createMerch(profile.id, { isPublic: true });

    const response = await requestApp
      .get(`artists/${profile.id}/merch`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / public merch in artist page order with options and shipping", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const second = await createMerch(profile.id, {
      title: "Second",
      isPublic: true,
    });
    const first = await createMerch(profile.id, {
      title: "First",
      isPublic: true,
    });
    await prisma.merch.update({ where: { id: first.id }, data: { order: 0 } });
    await prisma.merch.update({ where: { id: second.id }, data: { order: 1 } });
    await createMerch(profile.id, { title: "Private", isPublic: false });
    const deleted = await createMerch(profile.id, {
      title: "Deleted",
      isPublic: true,
    });
    await prisma.merch.delete({ where: { id: deleted.id } });

    await prisma.merchOptionType.create({
      data: {
        merchId: first.id,
        optionName: "Size",
        options: { create: [{ name: "Small" }, { name: "Large" }] },
      },
    });
    await createMerchShippingDestination({
      merchId: first.id,
      destinationCountry: "CA",
      costUnit: 500,
    });

    const response = await requestApp
      .get(`artists/${profile.urlSlug}/merch`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const { results } = response.body;
    assert.deepEqual(
      results.map((m: { id: string }) => m.id),
      [first.id, second.id]
    );
    assert.equal(results[0].optionTypes[0].optionName, "Size");
    assert.deepEqual(
      results[0].optionTypes[0].options
        .map((o: { name: string }) => o.name)
        .sort(),
      ["Large", "Small"]
    );
    assert.equal(results[0].shippingDestinations[0].destinationCountry, "CA");
    assert.deepEqual(results[1].optionTypes, []);
    assert.deepEqual(results[1].shippingDestinations, []);
  });
});
