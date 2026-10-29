import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach, afterEach } from "mocha";
import prisma from "@mirlo/prisma";

import assert from "assert";

import nodemailer from "nodemailer";
import sinon from "sinon";
import { Job, UnrecoverableError } from "bullmq";

import sendMail, { isEmailTransportConfigured } from "../../src/jobs/send-mail";
import { getEmailI18n } from "../../src/utils/emailTranslation";
import { SettingsType } from "../../src/utils/settings";
import { clearTables, createSiteSettings, createUser } from "../utils";

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
                        artist: {
                          name: "Test Artist",
                          urlSlug: "test-artist",
                        },
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

  describe("invite-email", () => {
    it("encodes the email and inviter name in the signup link exactly once", async () => {
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
          return Promise.resolve({ messageId: "test-invite" });
        },
      };
      sandbox.stub(nodemailer, "createTransport").returns(transport as any);

      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        await sendMail({
          data: {
            template: "invite-email",
            locals: {
              email: "new@example.com",
              token: "invite-token",
              accountType: "ARTIST",
              invitedBy: { name: "Ann & Bo", email: "admin@example.com" },
              client: "http://localhost:8080",
            },
            message: { to: "new@example.com" },
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
        sentHtml.includes("email=new%40example.com"),
        `link should contain the singly-encoded email, got: ${sentHtml}`
      );
      assert.ok(
        !sentHtml.includes("%2540"),
        "email should not be double-encoded"
      );
      assert.ok(
        sentHtml.includes("invitedBy=Ann%20%26%20Bo"),
        `link should contain the encoded inviter name, got: ${sentHtml}`
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

    it("renders fundraiser-success with and without a release", async () => {
      await createSiteSettings({
        emailProvider: {
          provider: "mailgun",
          fromEmail: "noreply@mirlo.test",
          mailgun: { apiKey: "key-test", domain: "mg.mirlo.test" },
        },
      });

      let sent: { html?: string; subject?: string } = {};
      const transport = {
        sendMail: (mail: typeof sent) => {
          sent = mail;
          return Promise.resolve({ messageId: "test-fundraiser-success" });
        },
      };
      sandbox.stub(nodemailer, "createTransport").returns(transport as any);

      const render = async (trackGroup?: {
        title: string;
        urlSlug: string;
      }) => {
        await sendMail({
          data: {
            template: "fundraiser-success",
            locals: {
              artist: { name: "Test Artist", urlSlug: "test-artist" },
              fundraiserName: "New Van",
              trackGroup,
              currency: "usd",
              pledgedAmount: 2000,
              fundraisingGoal: 100000,
              client: "http://localhost:3000",
            },
            message: { to: "backer@example.com" },
          },
        } as Job);
        return sent;
      };

      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        const standalone = await render();
        assert.equal(
          standalone.subject,
          "Fundraiser successful: New Van has been funded!"
        );
        assert.ok(
          standalone.html?.includes('href="http://localhost:3000/test-artist"')
        );
        assert.ok(!standalone.html?.includes("undefined"));

        const withRelease = await render({
          title: "Test Album",
          urlSlug: "test-album",
        });
        assert.ok(withRelease.html?.includes("Test Album"));
        assert.ok(
          withRelease.html?.includes(
            'href="http://localhost:3000/test-artist/release/test-album"'
          )
        );
      } finally {
        if (originalMailhog === undefined) {
          delete process.env.MAILHOG_PORT;
        } else {
          process.env.MAILHOG_PORT = originalMailhog;
        }
      }
    });

    it("renders the instance title in the sender, subject and body", async () => {
      await createSiteSettings({
        instanceCustomization: { title: "Nightjar" },
        emailProvider: {
          provider: "mailgun",
          fromEmail: "hello@mirlo.test",
          mailgun: {
            apiKey: "key-test",
            domain: "mg.mirlo.test",
          },
        },
      });

      let sent: { html?: string; subject?: string; from?: unknown } = {};
      const transport = {
        sendMail: (mail: typeof sent) => {
          sent = mail;
          return Promise.resolve({ messageId: "test-instance-name" });
        },
      };
      sandbox.stub(nodemailer, "createTransport").returns(transport as any);

      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
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

      assert.equal(sent.subject, "Welcome to Nightjar!");
      assert.ok(
        JSON.stringify(sent.from).includes("Nightjar"),
        `expected the sender name to be the instance title, got: ${JSON.stringify(sent.from)}`
      );
      assert.ok(
        (sent.html ?? "").includes("future emails from Nightjar"),
        `expected the footer to name the instance, got: ${(sent.html ?? "").slice(0, 500)}`
      );
    });

    describe("instance contact email", () => {
      const renderTemplate = async (
        template: string,
        locals: Record<string, unknown>
      ) => {
        let sentHtml = "";
        sandbox.stub(nodemailer, "createTransport").returns({
          sendMail: (mail: { html?: string }) => {
            sentHtml = mail.html ?? "";
            return Promise.resolve({ messageId: "test-contact" });
          },
        } as any);
        const originalMailhog = process.env.MAILHOG_PORT;
        process.env.MAILHOG_PORT = "1025";
        try {
          await sendMail({
            data: {
              template,
              locals,
              message: { to: "recipient@example.com" },
            },
          } as Job);
        } finally {
          if (originalMailhog === undefined) {
            delete process.env.MAILHOG_PORT;
          } else {
            process.env.MAILHOG_PORT = originalMailhog;
          }
        }
        return sentHtml;
      };

      const emailChangeLocals = {
        newEmail: "new@example.com",
        clientDomain: "http://localhost",
        token: "tok",
        userId: 1,
      };

      const disabledArtistLocals = {
        artistName: "Lumen Tide",
        userName: "Jane",
        reason: "<p>Spam</p>",
      };

      const mailgunProvider = {
        provider: "mailgun" as const,
        fromEmail: "hello@mirlo.test",
        mailgun: { apiKey: "key-test", domain: "mg.mirlo.test" },
      };

      it("points users to the instance contact email", async () => {
        await createSiteSettings({
          instanceCustomization: { contactEmail: " help@nightjar.test " },
          emailProvider: mailgunProvider,
        });

        const html = await renderTemplate(
          "confirm-email-change",
          emailChangeLocals
        );

        assert.ok(html.includes("please contact help@nightjar.test ASAP"));
        assert.ok(!html.includes("mirlo.space"));
      });

      it("leaves the contact line out when the instance has no contact email", async () => {
        await createSiteSettings({ emailProvider: mailgunProvider });

        const html = await renderTemplate(
          "confirm-email-change",
          emailChangeLocals
        );

        assert.ok(html.includes("new@example.com"));
        assert.ok(!html.includes("please contact"));
      });

      it("offers disabled artists an appeal through the support email", async () => {
        await createSiteSettings({
          instanceCustomization: {
            contactEmail: "hello@nightjar.test",
            supportEmail: "help@nightjar.test",
          },
          emailProvider: mailgunProvider,
        });

        const html = await renderTemplate(
          "artist-disabled-notification",
          disabledArtistLocals
        );

        assert.ok(html.includes("mailto:help@nightjar.test"));
        assert.ok(!html.includes("hello@nightjar.test"));
        assert.ok(html.includes("Next steps"));
      });

      it("falls back to the contact email for appeals without a support email", async () => {
        await createSiteSettings({
          instanceCustomization: { contactEmail: "hello@nightjar.test" },
          emailProvider: mailgunProvider,
        });

        const html = await renderTemplate(
          "artist-disabled-notification",
          disabledArtistLocals
        );

        assert.ok(html.includes("mailto:hello@nightjar.test"));
      });

      it("leaves the appeal out when the instance has no contact email", async () => {
        await createSiteSettings({ emailProvider: mailgunProvider });

        const html = await renderTemplate(
          "artist-disabled-notification",
          disabledArtistLocals
        );

        assert.ok(html.includes("Lumen Tide"));
        assert.ok(!html.includes("Next steps"));
      });
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

  describe("translation", () => {
    const sendPasswordReset = async (to: string) => {
      let sent: { html?: string; subject?: string } = {};
      sandbox.stub(nodemailer, "createTransport").returns({
        sendMail: (mail: typeof sent) => {
          sent = mail;
          return Promise.resolve({ messageId: "test-translation" });
        },
      } as any);
      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        await sendMail({
          data: {
            template: "password-reset",
            locals: {
              user: { id: 1, email: to },
              host: "http://localhost",
              token: "tok",
              accountIncomplete: false,
            },
            message: { to },
          },
        } as Job);
      } finally {
        if (originalMailhog === undefined) {
          delete process.env.MAILHOG_PORT;
        } else {
          process.env.MAILHOG_PORT = originalMailhog;
        }
      }
      return sent;
    };

    beforeEach(() => {
      getEmailI18n().addResourceBundle(
        "zz",
        "translation",
        {
          emails: {
            passwordReset: { subject: "{{instanceName}} : réinitialisation" },
          },
        },
        true,
        true
      );
    });

    it("renders in the recipient's language", async () => {
      await createSiteSettings({
        instanceCustomization: { title: "Simon's & Co" },
      });
      await createUser({ email: "zz@example.com", language: "zz" });

      const sent = await sendPasswordReset("ZZ@example.com");

      assert.equal(sent.subject, "Simon's & Co : réinitialisation");
      assert.ok(
        (sent.html ?? "").includes("Click here to confirm"),
        "untranslated strings fall back to English"
      );
    });

    it("renders in English for recipients without an account", async () => {
      await createSiteSettings({
        instanceCustomization: { title: "Nightjar" },
      });

      const sent = await sendPasswordReset("guest@example.com");

      assert.equal(sent.subject, "Nightjar: Password Reset");
      assert.ok((sent.html ?? "").includes("Someone wants to reset"));
    });
  });

  describe("recipient rejections", () => {
    const rejection = (recipient: string, response: string) =>
      Object.assign(new Error(`Recipient command failed: ${response}`), {
        recipient,
        response,
        responseCode: Number(response.slice(0, 3)),
      });

    const send = async (to: string) => {
      const originalMailhog = process.env.MAILHOG_PORT;
      process.env.MAILHOG_PORT = "1025";
      try {
        return await sendMail({
          data: {
            template: "error-email",
            locals: { error: "Test error", time: new Date().toDateString() },
            message: { to },
          },
        } as Job);
      } finally {
        if (originalMailhog === undefined) {
          delete process.env.MAILHOG_PORT;
        } else {
          process.env.MAILHOG_PORT = originalMailhog;
        }
      }
    };

    const allRejected = (...rejectedErrors: Error[]) =>
      Object.assign(
        new Error("Can't send mail - all recipients were rejected"),
        { code: "EENVELOPE", rejectedErrors }
      );

    const stubSendMail = (sendMail: () => Promise<unknown>) =>
      sandbox.stub(nodemailer, "createTransport").returns({ sendMail } as any);

    const bouncedAt = async (id: number) =>
      (await prisma.user.findUniqueOrThrow({ where: { id } })).emailBouncedAt;

    it("marks the user as bounced and stops retrying on an unknown address", async () => {
      const { user } = await createUser({ email: "gone@example.com" });
      stubSendMail(() =>
        Promise.reject(
          allRejected(rejection("gone@example.com", "550 5.1.1 User unknown"))
        )
      );

      await assert.rejects(send("gone@example.com"), UnrecoverableError);

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      assert.ok(updated.emailBouncedAt);
      assert.equal(updated.emailBounceReason, "550 5.1.1 User unknown");
    });

    it("marks rejected recipients when the send otherwise succeeds", async () => {
      const { user } = await createUser({ email: "gone@example.com" });
      stubSendMail(() =>
        Promise.resolve({
          messageId: "123",
          rejected: ["gone@example.com"],
          rejectedErrors: [
            rejection("gone@example.com", "550 5.1.1 User unknown"),
          ],
        })
      );

      await send("gone@example.com, other@example.com");

      assert.ok(await bouncedAt(user.id));
    });

    it("matches the stored email case-insensitively and literally", async () => {
      const { user } = await createUser({ email: "Gone_Away@Example.com" });
      const { user: lookalike } = await createUser({
        email: "gonexaway@example.com",
      });
      stubSendMail(() =>
        Promise.reject(
          allRejected(
            rejection("Gone_Away@example.com", "550 5.1.1 User unknown")
          )
        )
      );

      await assert.rejects(send("Gone_Away@Example.com"), UnrecoverableError);

      assert.ok(await bouncedAt(user.id));
      assert.equal(await bouncedAt(lookalike.id), null);
    });

    it("retries and leaves the user alone on a temporary rejection", async () => {
      const { user } = await createUser({ email: "busy@example.com" });
      stubSendMail(() =>
        Promise.reject(
          allRejected(
            rejection("busy@example.com", "451 4.7.1 Try again later")
          )
        )
      );

      await assert.rejects(send("busy@example.com"), (err: Error) => {
        assert.ok(!(err instanceof UnrecoverableError));
        return true;
      });

      assert.equal(await bouncedAt(user.id), null);
    });

    it("retries and leaves the user alone when the server refuses to relay", async () => {
      const { user } = await createUser({ email: "fine@example.com" });
      stubSendMail(() =>
        Promise.reject(
          allRejected(
            rejection("fine@example.com", "550 5.7.1 Relaying denied")
          )
        )
      );

      await assert.rejects(send("fine@example.com"), (err: Error) => {
        assert.ok(!(err instanceof UnrecoverableError));
        return true;
      });

      assert.equal(await bouncedAt(user.id), null);
    });

    it("still retries when another recipient was only temporarily rejected", async () => {
      const { user } = await createUser({ email: "gone@example.com" });
      stubSendMail(() =>
        Promise.reject(
          allRejected(
            rejection("gone@example.com", "550 5.1.1 User unknown"),
            rejection("accounting@example.com", "451 4.7.1 Try again later")
          )
        )
      );

      await assert.rejects(
        send("gone@example.com, accounting@example.com"),
        (err: Error) => {
          assert.ok(!(err instanceof UnrecoverableError));
          return true;
        }
      );

      assert.ok(await bouncedAt(user.id));
    });
  });

  describe("isEmailTransportConfigured", () => {
    let originalApiKey: string | undefined;
    let originalSender: string | undefined;

    beforeEach(() => {
      originalApiKey = process.env.SENDGRID_API_KEY;
      originalSender = process.env.SENDGRID_SENDER;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.SENDGRID_SENDER;
    });

    afterEach(() => {
      if (originalApiKey !== undefined) {
        process.env.SENDGRID_API_KEY = originalApiKey;
      }
      if (originalSender !== undefined) {
        process.env.SENDGRID_SENDER = originalSender;
      }
    });

    const withEmailProvider = (
      emailProvider: NonNullable<SettingsType["settings"]>["emailProvider"]
    ) =>
      ({
        platformPercent: 7,
        settings: { emailProvider },
      }) as SettingsType;

    it("is not configured without a sender address", () => {
      assert.equal(
        isEmailTransportConfigured(
          withEmailProvider({ provider: "smtp", smtp: { host: "mail.test" } })
        ),
        false
      );
      assert.equal(
        isEmailTransportConfigured(
          withEmailProvider({
            provider: "smtp",
            fromEmail: "  ",
            smtp: { host: "mail.test" },
          })
        ),
        false
      );
    });

    it("is not configured with a sender that is not a string", () => {
      assert.equal(
        isEmailTransportConfigured(
          withEmailProvider({
            provider: "smtp",
            fromEmail: 42 as unknown as string,
            smtp: { host: "mail.test" },
          })
        ),
        false
      );
    });

    it("is configured with a provider, its credentials and a sender", () => {
      assert.equal(
        isEmailTransportConfigured(
          withEmailProvider({
            provider: "smtp",
            fromEmail: "hello@nightjar.test",
            smtp: { host: "mail.test" },
          })
        ),
        true
      );
    });

    it("accepts the sender from the environment", () => {
      process.env.SENDGRID_API_KEY = "SG.env";
      process.env.SENDGRID_SENDER = "env@nightjar.test";

      assert.equal(isEmailTransportConfigured(withEmailProvider({})), true);
    });
  });
});
