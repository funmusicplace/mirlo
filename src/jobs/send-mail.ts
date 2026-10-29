import path from "path";

import prisma from "@mirlo/prisma";
import { UnrecoverableError } from "bullmq";
import Email from "email-templates";
import nodemailer, { Transporter } from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import postmarkTransport from "nodemailer-postmark-transport";
import sendgrid from "nodemailer-sendgrid";

import { logger } from "../logger";
import { isValidEmail } from "../utils/email";
import { getEmailLocals } from "../utils/emailTranslation";
import {
  DEFAULT_INSTANCE_NAME,
  getSiteSettings,
  resolveContactEmail,
  resolveFromEmail,
  resolveInstanceName,
  resolveSupportEmail,
  SettingsType,
} from "../utils/settings";

const viewsDir = path.join(__dirname, "../emails");

const DEFAULT_FROM_EMAIL = "no-reply@mirlo.space";

export const isEmailTransportConfigured = (settings: SettingsType): boolean => {
  const emailSettings = settings.settings?.emailProvider;
  if (!isValidEmail(resolveFromEmail(settings))) {
    return false;
  }
  return Boolean(
    (emailSettings?.provider === "mailgun" &&
      emailSettings.mailgun?.apiKey &&
      emailSettings.mailgun?.domain) ||
    (emailSettings?.provider === "sendgrid" &&
      emailSettings.sendgrid?.apiKey) ||
    (emailSettings?.provider === "postmark" &&
      emailSettings.postmark?.apiKey) ||
    (emailSettings?.provider === "smtp" && emailSettings.smtp?.host) ||
    process.env.SENDGRID_API_KEY
  );
};

/**
 * Creates a nodemailer transport based on site settings
 * Supports SendGrid, Mailgun, Postmark, plain SMTP, and MailHog (development) providers
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

    if (
      emailSettings?.provider === "postmark" &&
      emailSettings?.postmark?.apiKey
    ) {
      logger.info("Creating Postmark transport");
      return nodemailer.createTransport(
        postmarkTransport({
          auth: {
            apiKey: emailSettings.postmark.apiKey,
          },
        })
      );
    }

    if (emailSettings?.provider === "smtp" && emailSettings?.smtp?.host) {
      const { host, port, secure, user, password } = emailSettings.smtp;
      logger.info(`Creating SMTP transport for ${host}`);
      return nodemailer.createTransport({
        host,
        port: port || (secure ? 465 : 587),
        secure: !!secure,
        auth: user ? { user, pass: password } : undefined,
      });
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

    if (process.env.NODE_ENV !== "production") {
      logger.info("Creating MailHog transport (for development)");
      return nodemailer.createTransport({
        host: "mailhog",
        port: parseInt(process.env.MAILHOG_PORT || "1025"),
        secure: false,
      });
    }

    logger.warn(
      "No email provider configured. As this is set up as a production environment, no emails will be sent."
    );
    return { jsonTransport: true } as unknown as Transporter;
  } catch (err) {
    logger.error("Error creating email transport, falling back to JSON", err);
    return { jsonTransport: true } as unknown as Transporter;
  }
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
 * Gets the 'from' email address and the instance name from settings
 */
async function getEmailContext(): Promise<{
  fromEmail: string;
  instanceName: string;
  contactEmail: string | null;
  supportEmail: string | null;
}> {
  try {
    const settings = await getSiteSettings();
    const instanceName = resolveInstanceName(settings);
    const contactEmail = resolveContactEmail(settings);
    const supportEmail = resolveSupportEmail(settings);

    const configuredFromEmail = resolveFromEmail(settings);
    if (!configuredFromEmail) {
      logger.warn(`No from email configured, using ${DEFAULT_FROM_EMAIL}`);
    }
    const fromEmail = configuredFromEmail || DEFAULT_FROM_EMAIL;

    // Validate the email
    if (!isValidEmail(fromEmail)) {
      logger.warn(
        `Invalid from email configured: "${fromEmail}", using default instead`
      );
      return {
        fromEmail: DEFAULT_FROM_EMAIL,
        instanceName,
        contactEmail,
        supportEmail,
      };
    }

    return { fromEmail, instanceName, contactEmail, supportEmail };
  } catch (err) {
    logger.error("Error getting from email, using default", err);
    return {
      fromEmail: process.env.SENDGRID_SENDER || DEFAULT_FROM_EMAIL,
      instanceName: DEFAULT_INSTANCE_NAME,
      contactEmail: null,
      supportEmail: null,
    };
  }
}

type RecipientError = Error & {
  recipient?: string;
  response?: string;
};

type Bounce = { email: string; reason: string };

const deadAddressBounces = (errors: RecipientError[]): Bounce[] =>
  errors
    .filter(
      (error) =>
        error.recipient &&
        /^5\d\d[ -]5\.(1\.\d+|2\.1)\b/.test(error.response ?? "")
    )
    .map((error) => ({
      email: error.recipient as string,
      reason: error.response as string,
    }));

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const getRecipientLanguage = async (message: Mail.Options) => {
  const [recipient] = normalizeRecipients(message.to);
  const email = recipient ? recipientToEmail(recipient) : null;
  if (!email) {
    return undefined;
  }
  const user = await prisma.user.findFirst({
    where: { email: { equals: escapeLikePattern(email), mode: "insensitive" } },
    select: { language: true },
  });
  return user?.language;
};

export const recordBouncedRecipients = async (bounces: Bounce[]) => {
  try {
    await Promise.all(
      bounces.map(({ email, reason }) =>
        prisma.user.updateMany({
          where: {
            email: { equals: escapeLikePattern(email), mode: "insensitive" },
            emailBouncedAt: null,
          },
          data: {
            emailBouncedAt: new Date(),
            emailBounceReason: reason,
          },
        })
      )
    );
  } catch (err) {
    logger.error("sendMail: failed to record bounced recipients", err);
  }
};

export const sendMail = async <T>(job: {
  data: {
    template: string;
    message: Mail.Options;
    locals: T;
    fromName?: string;
    language?: string | null;
  };
}): Promise<{ fromEmail: string }> => {
  logger.info(`sendMail: sending: ${job.data.template}`);
  try {
    const transport = await createTransport();
    const { fromEmail, instanceName, contactEmail, supportEmail } =
      await getEmailContext();
    const message = dedupeRecipients(job.data.message);

    const email = new Email({
      message: {
        from: {
          name: job.data.fromName?.trim() || instanceName,
          address: fromEmail,
        },
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

    // Inject fromEmail into every template's locals so layout.pug can render
    // the "Add us to your contacts" footer line without each call site
    // remembering to pass it (#1676).
    const locals = {
      ...(job.data.locals as Record<string, unknown>),
      fromEmail,
      instanceName,
      contactEmail,
      supportEmail,
      ...getEmailLocals(
        job.data.language ?? (await getRecipientLanguage(message))
      ),
    };

    if (
      process.env.NODE_ENV === "production" ||
      process.env.MAILHOG_PORT ||
      process.env.SEND_EMAILS_IN_DEV === "true"
    ) {
      const info = await email.send({
        template: job.data.template,
        message,
        locals,
      });
      const bounces = deadAddressBounces(info?.rejectedErrors ?? []);
      if (bounces.length) {
        logger.warn(
          `sendMail: ${bounces.length} recipient(s) rejected for ${job.data.template}`
        );
        await recordBouncedRecipients(bounces);
      }
    } else {
      // If there was a problem with mailhog, print to logs
      await email.render(job.data.template + "/html", locals).then(logger.info);
    }

    logger.info(`sendMail: sent: ${job.data.template}`);

    return Promise.resolve({ fromEmail });
  } catch (err) {
    logger.error("MirloSendmailError", err);
    const rejectedErrors =
      (err as { rejectedErrors?: RecipientError[] }).rejectedErrors ?? [];
    const bounces = deadAddressBounces(rejectedErrors);
    if (bounces.length) {
      await recordBouncedRecipients(bounces);
      if (bounces.length === rejectedErrors.length) {
        throw new UnrecoverableError((err as Error).message);
      }
    }
    throw err;
  }
};

export default sendMail;
