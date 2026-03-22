import * as assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, afterEach } from "mocha";
import sinon from "sinon";
import { clearTables, createArtist, createUser } from "../../../utils";
import { requestApp } from "../../utils";

import prisma from "@mirlo/prisma";
import {
  sendMailQueue,
  sendMailQueueEvents,
} from "../../../../src/queues/send-mail-queue";
import labelsEndpoint from "../../../../src/routers/v1/manage/artists/{artistId}/labels/index";

describe("manage/artists/{artistId}/labels", () => {
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
    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  });

  describe("Integration tests", () => {
    describe("GET", () => {
      it("should return labels for an artist", async () => {
        const { user: artistUser, accessToken: artistAccessToken } =
          await createUser({ email: "artist@test.com" });
        const { user: labelUser } = await createUser({
          email: "label@test.com",
        });

        const artist = await createArtist(artistUser.id);

        // Create label user's label profile
        const labelProfile = await createArtist(labelUser.id, {
          isLabelProfile: true,
        });

        // Create label relationship
        await prisma.artistLabel.create({
          data: {
            artistId: artist.id,
            labelUserId: labelUser.id,
            isLabelApproved: true,
            isArtistApproved: false,
          },
        });

        const response = await requestApp
          .get(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${artistAccessToken}`])
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 1);
        assert.equal(response.body.results[0].labelUserId, labelUser.id);
        assert.equal(response.body.results[0].isLabelApproved, true);
      });

      it("should return empty list if no labels", async () => {
        const { user, accessToken } = await createUser({
          email: "artist@test.com",
        });
        const artist = await createArtist(user.id);

        const response = await requestApp
          .get(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 0);
      });
    });

    describe("POST", () => {
      it("should allow a label to add an artist", async () => {
        const { user: labelUser, accessToken: labelAccessToken } =
          await createUser({ email: "label@test.com" });
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
        });

        const artist = await createArtist(artistUser.id);
        const labelProfile = await createArtist(labelUser.id, {
          isLabelProfile: true,
        });

        const response = await requestApp
          .post(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${labelAccessToken}`])
          .send({
            labelUserId: labelUser.id,
            isLabelApproved: true,
          })
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 1);

        // Verify the relationship was created
        const createdLabel = await prisma.artistLabel.findFirst({
          where: {
            artistId: artist.id,
            labelUserId: labelUser.id,
          },
        });

        assert.ok(createdLabel);
        assert.equal(createdLabel.isLabelApproved, true);
        assert.equal(createdLabel.isArtistApproved, false);
      });

      it("should allow an artist to accept a label", async () => {
        const { user: labelUser } = await createUser({
          email: "label@test.com",
        });
        const { user: artistUser, accessToken: artistAccessToken } =
          await createUser({ email: "artist@test.com" });

        const artist = await createArtist(artistUser.id);
        const labelProfile = await createArtist(labelUser.id, {
          isLabelProfile: true,
        });

        const response = await requestApp
          .post(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${artistAccessToken}`])
          .send({
            labelUserId: labelUser.id,
          })
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);

        // Verify the relationship was created with artist approval
        const createdLabel = await prisma.artistLabel.findFirst({
          where: {
            artistId: artist.id,
            labelUserId: labelUser.id,
          },
        });

        assert.ok(createdLabel);
        assert.equal(createdLabel.isArtistApproved, true);
        assert.equal(createdLabel.isLabelApproved, false);
      });

      it("should not create duplicate notification if already exists", async () => {
        const { user: labelUser, accessToken: labelAccessToken } =
          await createUser({ email: "label@test.com" });
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
        });

        const artist = await createArtist(artistUser.id);
        const labelProfile = await createArtist(labelUser.id, {
          isLabelProfile: true,
        });

        // Create the notification first
        const existingNotification = await prisma.notification.create({
          data: {
            userId: artistUser.id,
            notificationType: "LABEL_ADDED_ARTIST",
            relatedUserId: labelUser.id,
            artistId: artist.id,
            content: "Existing notification",
          },
        });

        // Call the endpoint
        const response = await requestApp
          .post(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${labelAccessToken}`])
          .send({
            labelUserId: labelUser.id,
            isLabelApproved: true,
          })
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);

        // Verify only one notification exists
        const notifications = await prisma.notification.findMany({
          where: {
            userId: artistUser.id,
            notificationType: "LABEL_ADDED_ARTIST",
            relatedUserId: labelUser.id,
            artistId: artist.id,
          },
        });

        assert.equal(
          notifications.length,
          1,
          "Should not create duplicate notification"
        );
        assert.equal(
          notifications[0]?.id,
          existingNotification.id,
          "Should use existing notification, not create new one"
        );
      });

      it("should fail if labelUserId is missing", async () => {
        const { user: labelUser, accessToken: labelAccessToken } =
          await createUser({ email: "label@test.com" });
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
        });

        const artist = await createArtist(artistUser.id);

        const response = await requestApp
          .post(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${labelAccessToken}`])
          .send({
            isLabelApproved: true,
          })
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 400);
      });

      it("should fail if artist doesn't exist", async () => {
        const { user: labelUser, accessToken: labelAccessToken } =
          await createUser({ email: "label@test.com" });

        const response = await requestApp
          .post(`manage/artists/99999/labels`)
          .set("Cookie", [`jwt=${labelAccessToken}`])
          .send({
            labelUserId: labelUser.id,
            isLabelApproved: true,
          })
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 404);
      });
    });

    describe("DELETE", () => {
      it("should delete a label relationship", async () => {
        const { user: artistUser, accessToken: artistAccessToken } =
          await createUser({ email: "artist@test.com" });
        const { user: labelUser } = await createUser({
          email: "label@test.com",
        });

        const artist = await createArtist(artistUser.id);
        const labelProfile = await createArtist(labelUser.id, {
          isLabelProfile: true,
        });

        await prisma.artistLabel.create({
          data: {
            artistId: artist.id,
            labelUserId: labelUser.id,
            isLabelApproved: true,
            isArtistApproved: false,
          },
        });

        const response = await requestApp
          .delete(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${artistAccessToken}`])
          .send({
            labelUserId: labelUser.id,
          })
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 0);

        // Verify relationship was deleted
        const deletedLabel = await prisma.artistLabel.findFirst({
          where: {
            artistId: artist.id,
            labelUserId: labelUser.id,
          },
        });

        assert.equal(deletedLabel, null);
      });

      it("should fail if labelUserId is missing", async () => {
        const { user: artistUser, accessToken: artistAccessToken } =
          await createUser({ email: "artist@test.com" });

        const artist = await createArtist(artistUser.id);

        const response = await requestApp
          .delete(`manage/artists/${artist.id}/labels`)
          .set("Cookie", [`jwt=${artistAccessToken}`])
          .send({})
          .set("Accept", "application/json");

        assert.equal(response.statusCode, 400);
      });
    });
  });

  describe("Unit tests (direct function calls)", () => {
    it("should queue email with correct template and data when label adds artist", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves(undefined as any);

      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });

      const artist = await createArtist(artistUser.id);
      const label = await createArtist(labelUser.id, {
        name: "Label Name",
        isLabelProfile: true,
      });

      const operations = labelsEndpoint();
      const mockReq = {
        user: labelUser,
        params: { artistId: artist.id.toString() },
        body: {
          labelUserId: labelUser.id,
          isLabelApproved: true,
        },
      } as any;

      const mockRes = {
        json: sinon.stub().returnsThis(),
        status: sinon.stub().returnsThis(),
      } as any;

      const mockNext = sinon.stub();

      // Call the actual POST handler (index 2), not the middleware
      const postHandler = operations.POST[operations.POST.length - 1];
      await postHandler(mockReq, mockRes, mockNext);

      // Verify email was queued with correct data
      assert.equal(
        stub.calledOnce,
        true,
        "sendMailQueue.add should be called once"
      );
      const [queueName, emailData] = stub.getCall(0).args;
      assert.equal(queueName, "send-mail");
      assert.equal(emailData.template, "announce-label-invite");
      assert.equal(emailData.message.to, artistUser.email);
      assert.equal(emailData.locals.artist.id, artist.id);
      assert.ok(emailData.locals.label, "Label profile should be included");
    });

    it("should create notification alongside email queue", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves(undefined as any);

      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });

      const artist = await createArtist(artistUser.id);
      await createArtist(labelUser.id, { isLabelProfile: true });

      const operations = labelsEndpoint();
      const mockReq = {
        user: labelUser,
        params: { artistId: artist.id.toString() },
        body: {
          labelUserId: labelUser.id,
          isLabelApproved: true,
        },
      } as any;

      const mockRes = {
        json: sinon.stub().returnsThis(),
      } as any;

      const mockNext = sinon.stub();

      const postHandler = operations.POST[operations.POST.length - 1];
      await postHandler(mockReq, mockRes, mockNext);

      // Both notification and email should exist
      const notification = await prisma.notification.findFirst({
        where: {
          userId: artistUser.id,
          notificationType: "LABEL_ADDED_ARTIST",
          relatedUserId: labelUser.id,
          artistId: artist.id,
        },
      });
      assert.ok(notification, "Notification should be created");
      assert.equal(stub.calledOnce, true, "Email should be queued");
    });

    it("should continue on email queueing error", async () => {
      const stub = sinon
        .stub(sendMailQueue, "add")
        .rejects(new Error("Queue error"));

      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });

      const artist = await createArtist(artistUser.id);
      await createArtist(labelUser.id, { isLabelProfile: true });

      const operations = labelsEndpoint();
      const mockReq = {
        user: labelUser,
        params: { artistId: artist.id.toString() },
        body: {
          labelUserId: labelUser.id,
          isLabelApproved: true,
        },
      } as any;

      const mockRes = {
        json: sinon.stub().returnsThis(),
      } as any;

      const mockNext = sinon.stub();

      const postHandler = operations.POST[operations.POST.length - 1];
      await postHandler(mockReq, mockRes, mockNext);

      // Should still respond successfully even if email queueing failed
      assert.equal(mockRes.json.called, true, "Should send response");
      assert.equal(mockNext.called, false, "Should not call next with error");

      // Label relationship and notification should still be created
      const createdLabel = await prisma.artistLabel.findFirst({
        where: {
          artistId: artist.id,
          labelUserId: labelUser.id,
        },
      });
      assert.ok(createdLabel, "Label relationship should be created");

      const notification = await prisma.notification.findFirst({
        where: {
          userId: artistUser.id,
          notificationType: "LABEL_ADDED_ARTIST",
        },
      });
      assert.ok(notification, "Notification should be created");
    });

    it("should not duplicate notification if already exists", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves(undefined as any);

      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });

      const artist = await createArtist(artistUser.id);
      await createArtist(labelUser.id, { isLabelProfile: true });

      // Create notification first
      const existingNotification = await prisma.notification.create({
        data: {
          userId: artistUser.id,
          notificationType: "LABEL_ADDED_ARTIST",
          relatedUserId: labelUser.id,
          artistId: artist.id,
          content: "Existing notification",
        },
      });

      const operations = labelsEndpoint();
      const mockReq = {
        user: labelUser,
        params: { artistId: artist.id.toString() },
        body: {
          labelUserId: labelUser.id,
          isLabelApproved: true,
        },
      } as any;

      const mockRes = {
        json: sinon.stub().returnsThis(),
      } as any;

      const mockNext = sinon.stub();

      const postHandler = operations.POST[operations.POST.length - 1];
      await postHandler(mockReq, mockRes, mockNext);

      // Should not create duplicate notification
      const notifications = await prisma.notification.findMany({
        where: {
          userId: artistUser.id,
          notificationType: "LABEL_ADDED_ARTIST",
          relatedUserId: labelUser.id,
          artistId: artist.id,
        },
      });
      assert.equal(
        notifications.length,
        1,
        "Should only have one notification"
      );
      assert.equal(
        notifications[0]?.id,
        existingNotification.id,
        "Should be the original notification"
      );

      // Email should still be queued despite duplicate notification check
      assert.equal(stub.calledOnce, true, "Email should still be queued");
    });

    it("should fail if labelUserId is missing", async () => {
      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });

      const artist = await createArtist(artistUser.id);

      const operations = labelsEndpoint();
      const mockReq = {
        user: labelUser,
        params: { artistId: artist.id.toString() },
        body: {
          isLabelApproved: true,
        },
      } as any;

      const mockRes = {} as any;
      const mockNext = sinon.stub();

      const postHandler = operations.POST[operations.POST.length - 1];
      await postHandler(mockReq, mockRes, mockNext);

      // Should call next with error
      assert.equal(mockNext.calledOnce, true);
      const error = mockNext.getCall(0).args[0];
      assert.ok(error);
      assert.equal(error.httpCode, 400);
    });

    it("should fail if artist doesn't exist", async () => {
      const { user: labelUser } = await createUser({
        email: "label@test.com",
      });

      const operations = labelsEndpoint();
      const mockReq = {
        user: labelUser,
        params: { artistId: "99999" },
        body: {
          labelUserId: labelUser.id,
          isLabelApproved: true,
        },
      } as any;

      const mockRes = {} as any;
      const mockNext = sinon.stub();

      const postHandler = operations.POST[operations.POST.length - 1];
      await postHandler(mockReq, mockRes, mockNext);

      // Should call next with error
      assert.equal(mockNext.calledOnce, true);
      const error = mockNext.getCall(0).args[0];
      assert.ok(error);
      assert.equal(error.httpCode, 404);
    });
  });
});
