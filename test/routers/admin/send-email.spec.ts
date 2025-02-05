import assert from "node:assert";
import { Request, Response } from "express";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import { clearTables, createArtist, createUser } from "../../utils";
import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../../src/queues/send-mail-queue";
import sinon from "sinon";

import sendMailAdminEndpoint from "../../../src/routers/v1/admin/send-email";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

describe("admin/send-email", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    // Gotta make sure to close the queues and queue events
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  describe("/", () => {
    it("should POST / 401 without user", async () => {
      const response = await requestApp
        .post("admin/send-email")
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });
    it("should POST / 401 without admin", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const response = await requestApp
        .post("admin/send-email")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });

    it("should POST / 200 with admin", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
        isAdmin: true,
      });
      const response = await requestApp
        .post("admin/send-email")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });

    describe("endpoint as function", () => {
      it("should POST and send to an admin", async () => {
        const stub = sinon.stub(sendMailQueue, "add");

        const { user: artistUser } = await createUser({
          email: "artist@artist.com",
          isAdmin: true,
        });
        await createArtist(artistUser.id);

        await sendMailAdminEndpoint().POST[2](
          { body: {} } as Request,
          {} as Response,
          () => {}
        );

        assert.equal(stub.calledOnce, true);
        const args = stub.getCall(0).args;
        assert.equal(args[0], "send-mail");
        const data = args[1];
        assert.equal(data.template, "admin-announcement");
        assert.equal(data.message.to, artistUser.email);
        assert.equal(data.locals.user.id, artistUser.id);
      });

      it("should POST not send email to users without artists", async () => {
        const stub = sinon.stub(sendMailQueue, "add");

        const { user: artistUser } = await createUser({
          email: "artist@artist.com",
          isAdmin: true,
        });

        await createUser({
          email: "purchasesr@purchaser.com",
        });

        await createArtist(artistUser.id);

        await sendMailAdminEndpoint().POST[2](
          { body: {} } as Request,
          {} as Response,
          () => {}
        );

        assert.equal(stub.calledOnce, true);
        const args = stub.getCall(0).args;
        assert.equal(args[0], "send-mail");
        const data = args[1];
        assert.equal(data.template, "admin-announcement");
        assert.equal(data.message.to, artistUser.email);
        assert.equal(data.locals.user.id, artistUser.id);
      });
    });
  });
});
