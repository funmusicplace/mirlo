import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/trackGroupOrder", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should reorder the artist's own releases", async () => {
    const { user, accessToken } = await createUser({ email: "a@test.com" });
    const artist = await createArtist(user.id);
    const first = await createTrackGroup(artist.id, { urlSlug: "first" });
    const second = await createTrackGroup(artist.id, { urlSlug: "second" });

    const response = await requestApp
      .put(`manage/artists/${artist.id}/trackGroupOrder`)
      .send({ trackGroupIds: [second.id, first.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.length, 2);
    const reordered = await prisma.trackGroup.findMany({
      where: { id: { in: [first.id, second.id] } },
    });
    assert.equal(reordered.find((tg) => tg.id === second.id)?.orderIndex, 1);
    assert.equal(reordered.find((tg) => tg.id === first.id)?.orderIndex, 2);
  });

  it("should not reorder or return another artist's draft", async () => {
    const { user, accessToken } = await createUser({ email: "a@test.com" });
    const artist = await createArtist(user.id);

    const { user: victim } = await createUser({ email: "victim@test.com" });
    const victimArtist = await createArtist(victim.id);
    const draft = await createTrackGroup(victimArtist.id, {
      title: "Secret draft",
      publishedAt: null,
    });

    const response = await requestApp
      .put(`manage/artists/${artist.id}/trackGroupOrder`)
      .send({ trackGroupIds: [draft.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.result, []);
    const after = await prisma.trackGroup.findFirst({
      where: { id: draft.id },
    });
    assert.equal(after?.orderIndex, draft.orderIndex);
  });
});
