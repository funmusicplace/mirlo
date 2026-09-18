import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createMerch,
  createMerchShippingDestination,
  createTrackGroup,
  createUser,
} from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("GET /v1/merch/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404 when the artist is disabled", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id, { enabled: false });
    const merch = await createMerch(artist.id, {
      title: "Tote bag",
      isPublic: true,
    });
    await createMerchShippingDestination({ merchId: merch.id });

    const response = await requestApp
      .get(`merch/${merch.id}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / 200 for an admin when the artist is disabled", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id, { enabled: false });
    const merch = await createMerch(artist.id, {
      title: "Tote bag",
      isPublic: true,
    });
    await createMerchShippingDestination({ merchId: merch.id });
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });

    const response = await requestApp
      .get(`merch/${merch.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.id, merch.id);
  });

  it("returns the trackGroup's own artist on includePurchaseTrackGroup (#2008)", async () => {
    // A label-as-artist sells merch that bundles a release owned by a roster
    // artist. The client builds the album link from the merch response and
    // would 404 if it had to fall back to `merch.profile` (the label) — so the
    // payload needs to expose the trackGroup's actual artist.
    const { user: labelUser } = await createUser({
      email: "label@example.com",
      isLabelAccount: true,
    });
    const label = await createArtist(labelUser.id, {
      name: "Timeless Records",
      urlSlug: "timeless-records",
      isLabelProfile: true,
    });

    const { user: rosterUser } = await createUser({
      email: "roster@example.com",
    });
    const rosterArtist = await createArtist(rosterUser.id, {
      name: "Roster Artist",
      urlSlug: "roster-artist",
    });

    // Album lives under the roster artist…
    const album = await createTrackGroup(rosterArtist.id, {
      title: "Roster Album",
      urlSlug: "roster-album",
    });

    // …but the merch is sold by the label and bundles that album.
    const merch = await createMerch(label.id, {
      title: "White Vinyl",
      includePurchaseTrackGroupId: album.id,
    });
    await prisma.merch.update({
      where: { id: merch.id },
      data: {
        isPublic: true,
        shippingDestinations: {
          create: {
            homeCountry: "US",
            destinationCountry: null,
            costUnit: 0,
            costExtraUnit: 0,
          },
        },
      },
    });

    const response = await requestApp
      .get(`merch/${merch.urlSlug}?artistId=${label.urlSlug}`)
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.artist?.urlSlug, label.urlSlug);
    assert.equal(
      response.body.result.includePurchaseTrackGroup?.artist?.urlSlug,
      rosterArtist.urlSlug,
      "trackGroup carries its own artist so the album link points to /roster-artist/release/roster-album, not /timeless-records/release/..."
    );
  });
});
