import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";

import prisma from "@mirlo/prisma";
import { clearTables, createArtist, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("manage/label", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET /", () => {
    it("should not return deleted artists on the label's roster", async () => {
      const { user: labelUser, accessToken } = await createUser({
        email: "manage-label@example.com",
      });

      const { user: liveArtistUser } = await createUser({
        email: "live-roster-artist@example.com",
      });
      const liveArtist = await createArtist(liveArtistUser.id, {
        name: "Live Roster Artist",
        urlSlug: "live-roster-artist",
      });

      const { user: deletedArtistUser } = await createUser({
        email: "deleted-roster-artist@example.com",
      });
      const deletedArtist = await createArtist(deletedArtistUser.id, {
        name: "Deleted Roster Artist",
        urlSlug: "deleted-roster-artist",
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
        .get("manage/label")
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      const ids = response.body.results.map(
        (r: { artist: { id: number } }) => r.artist.id
      );
      assert.equal(ids.length, 1);
      assert.equal(ids[0], liveArtist.id);
    });
  });
});
