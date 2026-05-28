import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach, afterEach } from "mocha";

import assert from "assert";

import nodemailer from "nodemailer";
import sinon from "sinon";
import { Job } from "bullmq";

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

  describe("template rendering", () => {
    it("renders artist-purchase-notification without crashing when all variables are provided", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "noreply@mirlo.test",
          mailgun: { apiKey: "key-test", domain: "mg.mirlo.test" },
        },
      });

      let sentHtml = "";
      const transport = {
        sendMail: (mail: { html?: string }) => {
          sentHtml = mail.html ?? "";
          return Promise.resolve({ messageId: "test-artist-receipt" });
        },
      };
      sandbox.stub(nodemailer, "createTransport").returns(transport as any);

      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        await sendMail({
          data: {
            template: "artist-purchase-notification",
            locals: {
              email: "buyer@example.com",
              currency: "usd",
              client: "http://localhost:3000",
              totalGross: 1500,
              totalNet: 1250,
              message: null,
              transactions: [
                {
                  userFriendlyId: "TXN-001",
                  amount: 1500,
                  platformFee: 150,
                  stripeCut: 100,
                  trackGroupPurchases: [
                    {
                      proGratis: false,
                      trackGroup: {
                        title: "Test Album",
                        urlSlug: "test-album",
                        catalogNumber: "CAT-001",
                        artist: { name: "Test Artist", urlSlug: "test-artist" },
                      },
                    },
                  ],
                  trackPurchases: [
                    {
                      track: {
                        title: "Test Track",
                        isrc: "USRC12345678",
                        trackGroup: {
                          title: "Test Album",
                          urlSlug: "test-album",
                          artist: {
                            name: "Test Artist",
                            urlSlug: "test-artist",
                          },
                        },
                      },
                    },
                  ],
                  merchPurchases: [
                    {
                      merch: {
                        title: "Test Shirt",
                        sku: "SHIRT-M",
                        artist: { name: "Test Artist" },
                      },
                    },
                  ],
                  tips: [
                    {
                      artist: { name: "Test Artist", id: 1 },
                    },
                  ],
                },
              ],
            },
            message: { to: "artist@example.com" },
          },
        } as Job);
      } finally {
        if (originalMailhog === undefined) {
          delete process.env.MAILHOG_PORT;
        } else {
          process.env.MAILHOG_PORT = originalMailhog;
        }
      }

      assert.ok(sentHtml.length > 0, "should render non-empty HTML");
      assert.ok(
        sentHtml.includes("Test Artist"),
        `rendered HTML should contain the artist name, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        sentHtml.includes("Test Album"),
        `rendered HTML should contain the album title, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        sentHtml.includes("buyer@example.com"),
        `rendered HTML should contain the buyer email, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        sentHtml.includes("USD"),
        `rendered HTML should contain the currency, got: ${sentHtml.slice(0, 500)}`
      );
    });

    it("renders artist-new-subscriber-announce without crashing when all variables are provided", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "noreply@mirlo.test",
          mailgun: { apiKey: "key-test", domain: "mg.mirlo.test" },
        },
      });

      let sentHtml = "";
      const transport = {
        sendMail: (mail: { html?: string }) => {
          sentHtml = mail.html ?? "";
          return Promise.resolve({ messageId: "test-new-subscriber" });
        },
      };
      sandbox.stub(nodemailer, "createTransport").returns(transport as any);

      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        await sendMail({
          data: {
            template: "artist-new-subscriber-announce",
            locals: {
              isNewSubscription: true,
              interval: "MONTH",
              artist: {
                name: "Test Artist",
                user: { currency: "usd" },
              },
              artistUserSubscription: {
                id: 1,
                amount: 1000,
                artistSubscriptionTierId: 1,
                artistSubscriptionTier: { name: "Fan" },
              },
              user: {
                name: "Test Fan",
                email: "fan@example.com",
              },
              transaction: {
                amount: 1000,
                currency: "usd",
                platformCut: 100,
                stripeCut: 50,
              },
              email: "fan@example.com",
              client: "http://localhost:3000",
              host: "http://localhost:3000",
            },
            message: { to: "artist@example.com" },
          },
        } as Job);
      } finally {
        if (originalMailhog === undefined) {
          delete process.env.MAILHOG_PORT;
        } else {
          process.env.MAILHOG_PORT = originalMailhog;
        }
      }

      assert.ok(sentHtml.length > 0, "should render non-empty HTML");
      assert.ok(
        sentHtml.includes("Test Artist"),
        `rendered HTML should contain the artist name, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        sentHtml.includes("Test Fan"),
        `rendered HTML should contain the subscriber name, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        sentHtml.includes("fan@example.com"),
        `rendered HTML should contain the subscriber email, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        sentHtml.includes("Fan"),
        `rendered HTML should contain the tier name, got: ${sentHtml.slice(0, 500)}`
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

    it("renders the fromEmail in the email footer (Add us to contacts, #1676)", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "hello@mirlo.test",
          mailgun: {
            apiKey: "key-test",
            domain: "mg.mirlo.test",
          },
        },
      });

      // Capture the rendered HTML by stubbing the transport's sendMail.
      let sentHtml = "";
      const transport = {
        sendMail: (mail: { html?: string }) => {
          sentHtml = mail.html ?? "";
          return Promise.resolve({ messageId: "test-123" });
        },
      };
      sandbox.stub(nodemailer, "createTransport").returns(transport as any);

      // Force the production send branch (NODE_ENV=test runs the render branch
      // which logs instead of returning the body) — MAILHOG_PORT also triggers
      // the send branch.
      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        // new-user extends layout.pug so the footer block runs.
        await sendMail({
          data: {
            template: "new-user",
            locals: {
              user: {
                id: 1,
                email: "recipient@example.com",
                emailConfirmationToken: "tok",
              },
              clientDomain: "http://localhost",
              client: "frontend",
              accountType: "LISTENER",
            },
            message: {
              to: "recipient@example.com",
            },
          },
        } as Job);
      } finally {
        if (originalMailhog === undefined) {
          delete process.env.MAILHOG_PORT;
        } else {
          process.env.MAILHOG_PORT = originalMailhog;
        }
      }

      assert.ok(
        sentHtml.includes("hello@mirlo.test"),
        `expected the rendered email body to contain the fromEmail, got: ${sentHtml.slice(0, 500)}`
      );
      assert.ok(
        /add\s+hello@mirlo\.test\s+to your contacts/i.test(sentHtml),
        `expected the 'Add us to your contacts' footer line, got: ${sentHtml.slice(0, 500)}`
      );
    });

    it("should use default when configured fromEmail is invalid", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "sendgrid",
          fromEmail: "invalid-email-without-at-sign",
          sendgrid: {
            apiKey: "sg_test_key_123",
          },
        },
      });

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
        "Should fall back to default when configured email is invalid"
      );
    });
  });
});
