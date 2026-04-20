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
 * Supports SendGrid, Mailgun, and MailHog (development) providers
 * Falls back to JSON transport if no provider is configured
 */
async function createTransport(): Promise<Transporter> {
  try {
    const settings = await getSiteSettings();
    const emailSettings = settings.settings?.emailProvider;

    if (process.env.NODE_ENV === "test") {
      logger.info("Creating JSON transport for tests");
      return nodemailer.createTransport({
        jsonTransport: true,
      });
    }

    if (process.env.NODE_ENV !== "production") {
      logger.info("Creating MailHog transport");
      return nodemailer.createTransport({
        host: "mailhog",
        port: parseInt(process.env.MAILHOG_PORT || "1025"),
        secure: false,
      });
    }

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
 * Validates if a string is a valid email address
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

type RecipientValue = string | Mail.Address;

const splitRecipientString = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const recipientToEmail = (recipient: RecipientValue): string | null => {
  if (typeof recipient === "string") {
    const match = recipient.match(/<\s*([^>]+)\s*>/);
    const email = (match?.[1] ?? recipient).trim().toLowerCase();
    return isValidEmail(email) ? email : null;
  }

  const email = recipient.address?.trim().toLowerCase();
  return email && isValidEmail(email) ? email : null;
};

const normalizeRecipients = (
  recipients?: Mail.Address | string | Array<Mail.Address | string>
): RecipientValue[] => {
  if (!recipients) {
    return [];
  }

  const values = Array.isArray(recipients) ? recipients : [recipients];
  return values.reduce<RecipientValue[]>((acc, value) => {
    if (typeof value === "string") {
      acc.push(...splitRecipientString(value));
    } else {
      acc.push(value);
    }

    return acc;
  }, []);
};

const dedupeRecipients = (message: Mail.Options): Mail.Options => {
  const uniqueEmails = new Set<string>();
  const nextMessage: Mail.Options = { ...message };
  const recipientFields: Array<"to" | "cc" | "bcc"> = ["to", "cc", "bcc"];
  let removedRecipients = 0;

  for (const field of recipientFields) {
    const recipients = normalizeRecipients(message[field]);
    const uniqueRecipients: RecipientValue[] = [];

    for (const recipient of recipients) {
      const email = recipientToEmail(recipient);
      if (!email) {
        uniqueRecipients.push(recipient);
        continue;
      }

      if (uniqueEmails.has(email)) {
        removedRecipients += 1;
        continue;
      }

      uniqueEmails.add(email);
      uniqueRecipients.push(recipient);
    }

    if (uniqueRecipients.length === 0) {
      delete nextMessage[field];
    } else if (uniqueRecipients.length === 1) {
      nextMessage[field] = uniqueRecipients[0];
    } else {
      nextMessage[field] = uniqueRecipients;
    }
  }

  if (removedRecipients > 0) {
    logger.warn(
      `Removed ${removedRecipients} duplicate email recipient(s) for SendGrid compatibility`
    );
  }

  return nextMessage;
};

/**
 * Gets the 'from' email address from settings
 */
async function getFromEmail(): Promise<string> {
  try {
    const settings = await getSiteSettings();
    const emailSettings = settings.settings?.emailProvider;

    const fromEmail =
      emailSettings?.fromEmail ??
      process.env.SENDGRID_SENDER ??
      "no-reply@mirlo.space";

    // Validate the email
    if (!isValidEmail(fromEmail)) {
      logger.warn(
        `Invalid from email configured: "${fromEmail}", using default instead`
      );
      return "no-reply@mirlo.space";
    }

    return fromEmail;
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
    const message = dedupeRecipients(job.data.message);

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

    if (process.env.NODE_ENV === "production" || process.env.MAILHOG_PORT) {
      await email.send({
        template: job.data.template,
        message,
        locals: job.data.locals,
      });
    } else {
      // If there was a problem with mailhog, print to logs
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
