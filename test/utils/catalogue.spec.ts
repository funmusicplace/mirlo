import assert from "assert";

import * as dotenv from "dotenv";
import { describe, it } from "mocha";
dotenv.config();

import { calculateCatalogueFloorPrice } from "../../src/utils/catalogue";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

describe("calculateCatalogueFloorPrice", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("returns the flat minPrice when no percentage is set", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id, {
      purchaseEntireCatalogMinPrice: 500,
    });

    const floor = await calculateCatalogueFloorPrice(artist);
    assert.equal(floor, 500);
  });

  it("computes a percentage of the summed minPrice of purchasable releases", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id, {
      purchaseEntireCatalogMinPrice: 999999, // should be ignored
      purchaseEntireCatalogPercentage: 50,
    });

    await createTrackGroup(artist.id, { title: "Album One", minPrice: 1000 });
    await createTrackGroup(artist.id, { title: "Album Two", minPrice: 2000 });

    const floor = await calculateCatalogueFloorPrice(artist);
    // 50% of (1000 + 2000)
    assert.equal(floor, 1500);
  });

  it("excludes releases that aren't currently purchasable from the percentage total", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id, {
      purchaseEntireCatalogPercentage: 100,
    });

    await createTrackGroup(artist.id, { title: "Included", minPrice: 1000 });
    await createTrackGroup(artist.id, {
      title: "Not gettable",
      minPrice: 5000,
      isGettable: false,
    });
    await createTrackGroup(artist.id, {
      title: "Administered elsewhere",
      minPrice: 5000,
      paymentToUserId: (await createUser({ email: "other@other.com" })).user.id,
    });

    const floor = await calculateCatalogueFloorPrice(artist);
    assert.equal(floor, 1000);
  });
});
