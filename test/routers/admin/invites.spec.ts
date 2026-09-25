import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../../src/queues/send-mail-queue";
import { clearTables, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("admin/invites", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  after(async () => {
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  describe("POST", () => {
    it("should return 401 for non-admin user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });

      const response = await requestApp
        .post("admin/invites")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({ users: [{ email: "new@test.com" }], inviteType: "LISTENER" });

      assert.equal(response.statusCode, 401);
    });

    it("should report how many invitations were created and skipped", async () => {
      const { user: admin, accessToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      await prisma.invite.create({
        data: { email: "already@test.com", invitedById: admin.id },
      });

      const response = await requestApp
        .post("admin/invites")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json")
        .send({
          users: [
            { email: "new@test.com" },
            { email: "already@test.com" },
            { email: "new@test.com" },
          ],
          inviteType: "ARTIST",
        });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.created, 1);
      assert.equal(response.body.skipped, 2);
      const invites = await prisma.invite.findMany({
        orderBy: { email: "asc" },
      });
      assert.deepEqual(
        invites.map((invite) => invite.email),
        ["already@test.com", "new@test.com"]
      );
    });
  });
});
