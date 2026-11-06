import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createTier,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

const setup = async ({ labelIsArtistPayee = false } = {}) => {
  const { user: artistUser, accessToken: artistToken } = await createUser({
    email: "artist@test.com",
  });
  const { user: labelUser, accessToken: labelToken } = await createUser({
    email: "label@test.com",
    stripeAccountId: "acct_label",
  });
  await createProfile(labelUser.id, {
    name: "Driftwood Records",
    isLabelProfile: true,
  });
  const artist = await createProfile(artistUser.id, {
    name: "Moss Choir",
    ...(labelIsArtistPayee && { paymentToUserId: labelUser.id }),
  });
  await prisma.artistLabel.create({
    data: {
      artistId: artist.id,
      labelUserId: labelUser.id,
      isArtistApproved: true,
      isLabelApproved: true,
      canLabelManageArtist: true,
    },
  });
  const paysLabel = await createTrackGroup(artist.id, {
    title: "Pays label",
    urlSlug: "pays-label",
    paymentToUserId: labelUser.id,
  });
  const paysArtist = await createTrackGroup(artist.id, {
    title: "Pays artist",
    urlSlug: "pays-artist",
  });
  const tier = await createTier(artist.id, { minAmount: 500 });
  const { user: fan } = await createUser({ email: "fan@test.com" });
  const { user: fan2 } = await createUser({ email: "fan2@test.com" });
  await prisma.profileUserSubscription.createMany({
    data: [
      {
        userId: fan.id,
        profileSubscriptionTierId: tier.id,
        amount: 500,
        stripeSubscriptionKey: "sub_on_label",
        stripeAccountId: "acct_label",
      },
      {
        userId: fan2.id,
        profileSubscriptionTierId: tier.id,
        amount: 500,
        stripeSubscriptionKey: "sub_on_artist",
        stripeAccountId: "acct_artist",
      },
    ],
  });
  return {
    artist,
    labelUser,
    artistToken,
    labelToken,
    paysLabel,
    paysArtist,
  };
};

const payees = async (artistId: number) => {
  const artist = await prisma.profile.findFirstOrThrow({
    where: { id: artistId },
    select: {
      paymentToUserId: true,
      trackGroups: { select: { title: true, paymentToUserId: true } },
    },
  });
  return artist;
};

describe("removing a label from an artist", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("shows the artist what removing the label changes", async () => {
    const { artist, labelUser, artistToken } = await setup();

    const response = await requestApp
      .get(`manage/artists/${artist.id}/labels/${labelUser.id}`)
      .set("Cookie", [`jwt=${artistToken}`]);

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.result.trackGroups.map((tg: { title: string }) => tg.title),
      ["Pays label"]
    );
    assert.equal(response.body.result.isArtistPayee, false);
    assert.equal(response.body.result.activeSubscriptionCount, 1);
    assert.equal(response.body.result.newPayeeName, "Moss Choir");
  });

  it("lists every release using the artist default when the label is the payee", async () => {
    const { artist, labelToken } = await setup({ labelIsArtistPayee: true });

    const response = await requestApp
      .get(`manage/label/artists/${artist.id}`)
      .set("Cookie", [`jwt=${labelToken}`]);

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.result.trackGroups.map((tg: { title: string }) => tg.title),
      ["Pays artist", "Pays label"]
    );
    assert.equal(response.body.result.isArtistPayee, true);
  });

  it("clears the label as payee when the artist removes it", async () => {
    const { artist, labelUser, artistToken } = await setup({
      labelIsArtistPayee: true,
    });

    const response = await requestApp
      .delete(`manage/artists/${artist.id}/labels/${labelUser.id}`)
      .set("Cookie", [`jwt=${artistToken}`]);
    assert.equal(response.status, 200);

    const after = await payees(artist.id);
    assert.equal(after.paymentToUserId, null);
    assert(after.trackGroups.every((tg) => tg.paymentToUserId === null));
    assert.equal(
      await prisma.artistLabel.count({ where: { artistId: artist.id } }),
      0
    );
    assert.equal(
      await prisma.profileUserSubscription.count({
        where: { stripeAccountId: "acct_label" },
      }),
      1
    );
  });

  it("clears the label as payee when the label removes the artist", async () => {
    const { artist, labelToken } = await setup({ labelIsArtistPayee: true });

    const response = await requestApp
      .delete(`manage/label/artists/${artist.id}`)
      .set("Cookie", [`jwt=${labelToken}`]);
    assert.equal(response.status, 200);

    const after = await payees(artist.id);
    assert.equal(after.paymentToUserId, null);
    assert(after.trackGroups.every((tg) => tg.paymentToUserId === null));
    assert.equal(
      await prisma.artistLabel.count({ where: { artistId: artist.id } }),
      0
    );
  });

  it("doesn't let another user remove an artist from a label", async () => {
    const { artist } = await setup({ labelIsArtistPayee: true });
    const { accessToken } = await createUser({ email: "other@test.com" });

    for (const req of [
      requestApp.get(`manage/label/artists/${artist.id}`),
      requestApp.delete(`manage/label/artists/${artist.id}`),
    ]) {
      const response = await req.set("Cookie", [`jwt=${accessToken}`]);
      assert.equal(response.status, 404);
    }

    const after = await payees(artist.id);
    assert.notEqual(after.paymentToUserId, null);
    assert.equal(
      await prisma.artistLabel.count({ where: { artistId: artist.id } }),
      1
    );
  });
});
