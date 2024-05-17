import path from "path";
import nodemailer, { Transporter } from "nodemailer";
import sendgrid from "nodemailer-sendgrid";
import Email from "email-templates";
import { logger } from "../logger";
import { Job } from "bullmq";

const viewsDir = path.join(__dirname, "../emails");

const transport: Transporter = !!process.env.SENDGRID_API_KEY
  ? nodemailer.createTransport(
      sendgrid({
        apiKey: process.env.SENDGRID_API_KEY!,
      })
    )
  : ({ jsonTransport: true } as unknown as Transporter);

/**
 * Cleanup incoming folder and more (later)
 */

export const sendMail = async (job: Job) => {
  logger.info(`sendMail: sending: ${job.data.template}`);
  try {
    const email = new Email({
      message: {
        from: `"Mirlo" <${
          process.env.SENDGRID_SENDER ?? "no-reply@mirlo.space"
        }>`,
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

    return Promise.resolve();
  } catch (err) {
    console.error("MirloSendmailError", err);
    throw err;
  }
};

export default sendMail;
