import path from "path";
import nodemailer, { Transporter } from "nodemailer";
import sendgrid from "nodemailer-sendgrid";
import Email from "email-templates";
import { logger } from "../logger";
import { Job } from "bullmq";
import Mail from "nodemailer/lib/mailer";

const viewsDir = path.join(__dirname, "../emails");

const transport: Transporter = !!process.env.SENDGRID_API_KEY
  ? nodemailer.createTransport(
      sendgrid({
        apiKey: process.env.SENDGRID_API_KEY!,
      })
    )
  : ({ jsonTransport: true } as unknown as Transporter);

export const sendErrorEmail = async (error: unknown) => {
  sendMail({
    data: {
      template: "error-email",
      message: {
        to: "hi@mirlo.space",
      },
      locals: { error: JSON.stringify(error), time: new Date().toDateString() },
    },
  });
};

export const sendMail = async (job: {
  data: {
    template: string;
    message: Mail.Options;
    locals: { [key: string]: unknown };
  };
}) => {
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
