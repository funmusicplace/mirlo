import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createFundraiser,
  createFundraiserPledge,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/fundraisers/{fundraiserId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("lets the profile's owner see a fundraiser without a release", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id, {
        name: "Standalone",
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, fundraiser.id);
    });

    it("includes how much has been pledged, leaving out cancelled pledges", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { user: backer } = await createUser({ email: "a@example.com" });
      const { user: quitter } = await createUser({ email: "b@example.com" });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id, {
        isAllOrNothing: true,
      });
      await createFundraiserPledge(fundraiser.id, backer.id, { amount: 2500 });
      await createFundraiserPledge(fundraiser.id, quitter.id, {
        amount: 9000,
        cancelledAt: new Date(),
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.amountRaised, 2500);
      assert.equal(response.body.result.pledgeCount, 1);
    });

    it("hides a fundraiser from other users", async () => {
      const { user } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { accessToken: otherToken } = await createUser({
        email: "other@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id, {
        name: "Standalone",
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
  });

  describe("PUT", () => {
    const setUp = async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
        stripeAccountId: "acct_fundraiser_owner",
      });
      const { user: backer } = await createUser({
        email: "backer@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const fundraiser = await createFundraiser(trackGroup.profileId, {
        trackGroupId: trackGroup.id,
        isAllOrNothing: true,
      });
      return { accessToken, backer, fundraiser };
    };

    it("saves the minimum pledge", async () => {
      const { accessToken, fundraiser } = await setUp();

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ minPledge: 2500 })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.minPledge, 2500);
    });

    it("cleans the description, leaving out images", async () => {
      const { accessToken, fundraiser } = await setUp();
      const video = `<iframe src="https://www.youtube-nocookie.com/embed/abc" allow="autoplay; fullscreen"></iframe>`;

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({
          description: `<p onclick="alert(1)"><strong>Hi</strong></p><script>alert(2)</script><img src="https://example.com/a.jpg" />${video}`,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const saved = await prisma.fundraiser.findUniqueOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(saved.description, `<p><strong>Hi</strong></p>${video}`);
    });

    it("saves and clears the end date", async () => {
      const { accessToken, fundraiser } = await setUp();
      const endDate = "2026-12-01T23:59:59.000Z";

      const saved = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ endDate })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(saved.statusCode, 200);
      assert.equal(saved.body.result.endDate, endDate);

      const cleared = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ endDate: null })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(cleared.statusCode, 200);
      assert.equal(cleared.body.result.endDate, null);
    });

    it("rejects an empty name", async () => {
      const { accessToken, fundraiser } = await setUp();

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ name: "   " })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      const refreshed = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed.name, fundraiser.name);
    });

    it("rejects amounts that aren't whole, non-negative cents", async () => {
      const { accessToken, fundraiser } = await setUp();

      for (const body of [
        { goalAmount: 10.5 },
        { goalAmount: -100 },
        { goalAmount: "lots" },
        { minPledge: -1 },
        { minPledge: 2.25 },
      ]) {
        const response = await requestApp
          .put(`manage/fundraisers/${fundraiser.id}`)
          .send(body)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 400, JSON.stringify(body));
      }
      const refreshed = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed.goalAmount, fundraiser.goalAmount);
      assert.equal(refreshed.minPledge, fundraiser.minPledge);
    });

    it("rejects an end date that isn't a date", async () => {
      const { accessToken, fundraiser } = await setUp();

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ endDate: "next tuesday" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("keeps the video link as pasted and returns its embed URL", async () => {
      const { accessToken, fundraiser } = await setUp();

      const saved = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ videoUrl: " https://youtu.be/dQw4w9WgXcQ?si=abc " })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(saved.statusCode, 200);
      assert.equal(
        saved.body.result.videoUrl,
        "https://youtu.be/dQw4w9WgXcQ?si=abc"
      );
      assert.equal(
        saved.body.result.videoEmbedUrl,
        "https://www.youtube.com/embed/dQw4w9WgXcQ"
      );

      const cleared = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ videoUrl: "" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(cleared.statusCode, 200);
      assert.equal(cleared.body.result.videoUrl, null);
      assert.equal(cleared.body.result.videoEmbedUrl, null);
    });

    it("rejects a video link that isn't YouTube or Vimeo", async () => {
      const { accessToken, fundraiser } = await setUp();

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ videoUrl: "https://example.com/watch?v=dQw4w9WgXcQ" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      const saved = await prisma.fundraiser.findUniqueOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(saved.videoUrl, null);
    });

    it("saves the URL slug and the public switch", async () => {
      const { accessToken, fundraiser } = await setUp();

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ urlSlug: "Our New Van", isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.urlSlug, "our-new-van");
      assert.equal(response.body.result.isPublic, true);
    });

    it("refuses a URL slug another of the artist's fundraisers uses", async () => {
      const { accessToken, fundraiser } = await setUp();
      await createFundraiser(fundraiser.profileId, { urlSlug: "taken" });

      const taken = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ urlSlug: "taken" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(taken.statusCode, 400);

      const empty = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ urlSlug: "  " })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(empty.statusCode, 400);
    });

    it("refuses to change isAllOrNothing while there are open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ isAllOrNothing: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const refreshed = await prisma.fundraiser.findUnique({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed?.isAllOrNothing, true);
    });

    it("still allows other edits while there are open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ name: "New name", isAllOrNothing: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "New name");
    });

    it("allows changing isAllOrNothing when all pledges are cancelled", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id, {
        cancelledAt: new Date(),
      });

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ isAllOrNothing: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const refreshed = await prisma.fundraiser.findUnique({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed?.isAllOrNothing, false);
    });

    const put = (fundraiserId: number, accessToken: string, body: object) =>
      requestApp
        .put(`manage/fundraisers/${fundraiserId}`)
        .send(body)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

    it("returns 400 for fields of the wrong type", async () => {
      const { accessToken, fundraiser } = await setUp();

      for (const body of [
        { isPublic: "yes" },
        { isAllOrNothing: 1 },
        { description: 5 },
        { urlSlug: 5 },
        { videoUrl: 5 },
        { endDate: 12345 },
      ]) {
        const response = await put(fundraiser.id, accessToken, body);
        assert.equal(response.statusCode, 400, JSON.stringify(body));
      }
    });

    it("refuses a URL slug made only of digits", async () => {
      const { accessToken, fundraiser } = await setUp();

      const response = await put(fundraiser.id, accessToken, {
        urlSlug: "2024",
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.code, "fundraiser_slug_invalid");
    });

    it("renames the URL with the fundraiser until it's public", async () => {
      const { accessToken, fundraiser } = await setUp();

      const draft = await put(fundraiser.id, accessToken, {
        name: "Our New Van",
      });
      assert.equal(draft.body.result.urlSlug, "our-new-van");

      await put(fundraiser.id, accessToken, { isPublic: true });
      const published = await put(fundraiser.id, accessToken, {
        name: "Another name",
      });
      assert.equal(published.body.result.urlSlug, "our-new-van");
    });

    it("refuses to make a fundraiser public before payments are set up", async () => {
      const { user, accessToken } = await createUser({
        email: "no-stripe@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id, { name: "Van" });

      const response = await put(fundraiser.id, accessToken, {
        isPublic: true,
      });

      assert.equal(response.statusCode, 400);
      const refreshed = await prisma.fundraiser.findUniqueOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed.isPublic, false);
    });

    it("refuses to make a fundraiser private while it has open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await put(fundraiser.id, accessToken, { isPublic: true });
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await put(fundraiser.id, accessToken, {
        isPublic: false,
      });

      assert.equal(response.statusCode, 400);
      const refreshed = await prisma.fundraiser.findUniqueOrThrow({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed.isPublic, true);
    });

    it("locks the goal and minimum pledge once supporters have pledged", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const goal = await put(fundraiser.id, accessToken, {
        goalAmount: fundraiser.goalAmount + 100,
      });
      const minimum = await put(fundraiser.id, accessToken, {
        minPledge: fundraiser.minPledge + 100,
      });
      const unchanged = await put(fundraiser.id, accessToken, {
        goalAmount: fundraiser.goalAmount,
        name: "Same goal",
      });

      assert.equal(goal.statusCode, 400);
      assert.equal(minimum.statusCode, 400);
      assert.equal(unchanged.statusCode, 200);
    });
  });

  describe("DELETE", () => {
    it("cancels open pledges, keeps paid ones and unlinks the release", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { user: backer } = await createUser({ email: "a@example.com" });
      const { user: paidBacker } = await createUser({
        email: "b@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const fundraiser = await createFundraiser(artist.id, {
        trackGroupId: trackGroup.id,
      });
      const openPledge = await createFundraiserPledge(fundraiser.id, backer.id);
      const paidAt = new Date();
      const paidPledge = await createFundraiserPledge(
        fundraiser.id,
        paidBacker.id,
        { paidAt }
      );

      const response = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(
        await prisma.fundraiser.findFirst({ where: { id: fundraiser.id } }),
        null
      );

      const pledges = await prisma.fundraiserPledge.findMany({
        where: { fundraiserId: fundraiser.id },
      });
      const open = pledges.find((p) => p.id === openPledge.id);
      const paid = pledges.find((p) => p.id === paidPledge.id);
      assert.ok(open?.cancelledAt);
      assert.equal(paid?.cancelledAt, null);
      assert.deepEqual(paid?.paidAt, paidAt);

      const release = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      assert.equal(release?.fundraiserId, null);
    });

    it("refuses while pledges are being charged, and allows it once they're settled", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { user: backer } = await createUser({ email: "a@example.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const fundraiser = await createFundraiser(artist.id, {
        trackGroupId: trackGroup.id,
        isAllOrNothing: true,
        status: "SUCCESSFUL",
      });
      const pledge = await createFundraiserPledge(fundraiser.id, backer.id);

      const refused = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(refused.statusCode, 409);
      const stillThere = await prisma.fundraiser.findFirstOrThrow({
        where: { id: fundraiser.id },
        include: { trackGroups: true },
      });
      assert.equal(stillThere.trackGroups.length, 1);
      const untouched = await prisma.fundraiserPledge.findUniqueOrThrow({
        where: { id: pledge.id },
      });
      assert.equal(untouched.cancelledAt, null);

      await prisma.fundraiserPledge.update({
        where: { id: pledge.id },
        data: { paidAt: new Date() },
      });
      const allowed = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(allowed.statusCode, 200);
    });

    it("frees the deleted fundraiser's URL for a new one", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const artist = await createArtist(user.id);
      const create = () =>
        requestApp
          .post(`manage/artists/${artist.id}/fundraisers`)
          .send({ name: "New van" })
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

      const first = await create();
      assert.equal(first.body.result.urlSlug, "new-van");

      await requestApp
        .delete(`manage/fundraisers/${first.body.result.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const second = await create();
      assert.equal(second.statusCode, 200);
      assert.equal(second.body.result.urlSlug, "new-van");
    });

    it("doesn't let other users delete a fundraiser", async () => {
      const { user } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { accessToken: otherToken } = await createUser({
        email: "other@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id);

      const response = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.ok(
        await prisma.fundraiser.findFirst({ where: { id: fundraiser.id } })
      );
    });
  });
});
