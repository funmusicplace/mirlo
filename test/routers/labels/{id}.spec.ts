import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import request from "supertest";
import { clearTables, createArtist, createUser } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("GET /v1/labels/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("returns 404 when the label's owner has isLabelAccount = false (#1804)", async () => {
    const { user: labelUser } = await createUser({
      email: "off-label@example.com",
      isLabelAccount: false,
    });
    const label = await createArtist(labelUser.id, {
      name: "Disabled Label",
      isLabelProfile: true,
      urlSlug: "disabled-label",
    });

    const response = await requestApp
      .get(`labels/${label.urlSlug}`)
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });

  it("should not include deleted roster artists in artistLabels", async () => {
    const { user: labelUser } = await createUser({
      email: "label-roster@example.com",
      isLabelAccount: true,
    });
    const label = await createArtist(labelUser.id, {
      name: "Label With Deleted Member",
      isLabelProfile: true,
    });

    const { user: liveArtistUser } = await createUser({
      email: "live-artist@example.com",
    });
    const liveArtist = await createArtist(liveArtistUser.id, {
      name: "Live Artist",
      urlSlug: "live-artist",
    });

    const { user: deletedArtistUser } = await createUser({
      email: "deleted-artist@example.com",
    });
    const deletedArtist = await createArtist(deletedArtistUser.id, {
      name: "Deleted Artist",
      urlSlug: "deleted-artist",
    });

    await prisma.artistLabel.createMany({
      data: [
        {
          labelUserId: labelUser.id,
          artistId: liveArtist.id,
          isLabelApproved: true,
          isArtistApproved: true,
        },
        {
          labelUserId: labelUser.id,
          artistId: deletedArtist.id,
          isLabelApproved: true,
          isArtistApproved: true,
        },
      ],
    });

    await prisma.artist.update({
      where: { id: deletedArtist.id },
      data: { deletedAt: new Date() },
    });

    const response = await requestApp
      .get(`labels/${label.urlSlug}`)
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const artistLabels = response.body.result.artistLabels ?? [];
    assert.equal(artistLabels.length, 1);
    assert.equal(artistLabels[0].artist.id, liveArtist.id);
  });
});
