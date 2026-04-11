import path from "path";
import nodemailer, { Transporter } from "nodemailer";
import sendgrid from "nodemailer-sendgrid";
import Email from "email-templates";
import { logger } from "../logger";
import Mail from "nodemailer/lib/mailer";
import { getSiteSettings } from "../utils/settings";

const viewsDir = path.join(__dirname, "../emails");

/**
 * Creates a nodemailer transport based on site settings
 * Supports SendGrid and Mailgun providers
 * Falls back to JSON transport if no provider is configured
 */
async function createTransport(): Promise<Transporter> {
  try {
    const settings = await getSiteSettings();
    const emailSettings = settings.settings?.emailProvider;

    // If emailSettings has a provider, use it; otherwise check for legacy settings
    if (
      emailSettings?.provider === "mailgun" &&
      emailSettings?.mailgun?.apiKey &&
      emailSettings?.mailgun?.domain
    ) {
      logger.info("Creating Mailgun transport");
      // Use dynamic import for nodemailer-mailgun-transport
      const mailgunTransport = await import("nodemailer-mailgun-transport");
      return nodemailer.createTransport(
        mailgunTransport.default({
          auth: {
            api_key: emailSettings.mailgun.apiKey,
            domain: emailSettings.mailgun.domain,
          },
        })
      );
    }

    if (
      emailSettings?.provider === "sendgrid" &&
      emailSettings?.sendgrid?.apiKey
    ) {
      logger.info("Creating SendGrid transport");
      return nodemailer.createTransport(
        sendgrid({
          apiKey: emailSettings.sendgrid.apiKey,
        })
      );
    }

    // Fallback: check legacy environment variable
    if (process.env.SENDGRID_API_KEY) {
      logger.info("Creating SendGrid transport from environment variable");
      return nodemailer.createTransport(
        sendgrid({
          apiKey: process.env.SENDGRID_API_KEY,
        })
      );
    }

    logger.warn(
      "No email provider configured, using JSON transport for development"
    );
    return { jsonTransport: true } as unknown as Transporter;
  } catch (err) {
    logger.error("Error creating email transport, falling back to JSON", err);
    return { jsonTransport: true } as unknown as Transporter;
  }
}

export const sendErrorEmail = async (error: Error) => {
  sendMail({
    data: {
      template: "error-email",
      message: {
        to: "hi@mirlo.space",
      },
      locals: {
        error: JSON.stringify(error.stack),
        time: new Date().toDateString(),
      },
    },
  });
};

/**
 * Gets the 'from' email address from settings
 */
async function getFromEmail(): Promise<string> {
  try {
    const settings = await getSiteSettings();
    const emailSettings = settings.settings?.emailProvider;
    console.log("settings", settings);

    return (
      emailSettings?.fromEmail ??
      process.env.SENDGRID_SENDER ??
      "no-reply@mirlo.space"
    );
  } catch (err) {
    logger.error("Error getting from email, using default", err);
    return process.env.SENDGRID_SENDER ?? "no-reply@mirlo.space";
  }
}

export const sendMail = async <T>(job: {
  data: {
    template: string;
    message: Mail.Options;
    locals: T;
  };
}): Promise<{ fromEmail: string }> => {
  logger.info(`sendMail: sending: ${job.data.template}`);
  try {
    const transport = await createTransport();
    const fromEmail = await getFromEmail();
    console.log("fromEmail", fromEmail);

    const email = new Email({
      message: {
        from: `"Mirlo" <${fromEmail}>`,
        attachDataUrls: true,
      },
      juice: true,
      send: true,
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: path.resolve(viewsDir),
        },
      },
      transport,
    });

    if (process.env.NODE_ENV === "production") {
      await email.send({
        template: job.data.template,
        message: job.data.message,
        locals: job.data.locals,
      });
    } else {
      await email
        .render(job.data.template + "/html", job.data.locals)
        .then(logger.info);
    }

    logger.info(`sendMail: sent: ${job.data.template}`);

    return Promise.resolve({ fromEmail });
  } catch (err) {
    console.error("MirloSendmailError", err);
    throw err;
  }
};

export default sendMail;
