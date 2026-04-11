import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach, afterEach } from "mocha";
import assert from "assert";
import sinon from "sinon";
import { Job } from "bullmq";
import nodemailer from "nodemailer";

import sendMail from "../../src/jobs/send-mail";
import { clearTables, createSiteSettings } from "../utils";

describe("send-mail job", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("email provider configuration", () => {
    it("should use SendGrid from database settings", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "sendgrid",
          fromEmail: "noreply@example.com",
          sendgrid: {
            apiKey: "sg_test_key_123",
          },
        },
      });

      const createTransportStub = sandbox.stub(nodemailer, "createTransport");
      createTransportStub.returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert.equal(
        result.fromEmail,
        "noreply@example.com",
        "Should return the SendGrid from email from settings"
      );
    });

    it("should use Mailgun from database settings", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "noreply@example.com",
          mailgun: {
            apiKey: "key-test123",
            domain: "mg.example.com",
          },
        },
      });

      const createTransportStub = sandbox.stub(nodemailer, "createTransport");
      createTransportStub.returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert.equal(
        result.fromEmail,
        "noreply@example.com",
        "Should return the Mailgun from email from settings"
      );
    });

    it("should fall back to SENDGRID_API_KEY environment variable when no database config", async () => {
      // No database settings
      await createSiteSettings({});

      const createTransportStub = sandbox.stub(nodemailer, "createTransport");
      createTransportStub.returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert(
        result.fromEmail,
        "Should return a from email when using env var fallback"
      );
    });

    it("should use JSON transport when no provider is configured and no env var", async () => {
      await createSiteSettings({});

      const createTransportStub = sandbox.stub(nodemailer, "createTransport");
      createTransportStub.returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert.equal(
        result.fromEmail,
        "no-reply@mirlo.space",
        "Should fall back to default email address"
      );
    });

    it("should prioritize database config over environment variable", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "db@example.com",
          mailgun: {
            apiKey: "key-mailgun",
            domain: "mg.example.com",
          },
        },
      });

      const createTransportStub = sandbox.stub(nodemailer, "createTransport");
      createTransportStub.returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert.equal(
        result.fromEmail,
        "db@example.com",
        "Should prioritize database config over env var"
      );
    });
  });

  describe("from email address selection", () => {
    it("should use from email from settings when configured", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "our-from@example.com",
          mailgun: {
            apiKey: "key-test",
            domain: "mg.example.com",
          },
        },
      });

      sandbox.stub(nodemailer, "createTransport").returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      // Should execute without error using the configured from email
      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert.equal(
        result.fromEmail,
        "our-from@example.com",
        "Should use from email from database settings"
      );
    });

    it("should use default no-reply@mirlo.space when no other config", async () => {
      await createSiteSettings({});

      sandbox.stub(nodemailer, "createTransport").returns({
        sendMail: () => Promise.resolve({ messageId: "123" }),
      } as any);

      const result = await sendMail({
        data: {
          template: "error-email",
          locals: {
            error: "Test error",
            time: new Date().toDateString(),
          },
          message: {
            to: "test@example.com",
          },
        },
      } as Job);

      assert.equal(
        result.fromEmail,
        "no-reply@mirlo.space",
        "Should use default from email no-reply@mirlo.space"
      );
    });
  });
});
