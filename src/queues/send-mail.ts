import path from "path";
import nodemailer, { Transporter } from "nodemailer";
import sendgrid from "nodemailer-sendgrid";
import Email from "email-templates";
import { logger } from "../logger";
import { Job, Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};
const viewsDir = path.join(__dirname, "../emails");

const transport: Transporter = !!process.env.SENDGRID_API_KEY
  ? nodemailer.createTransport(
      sendgrid({
        apiKey: process.env.SENDGRID_API_KEY!,
      })
    )
  : ({ jsonTransport: true } as unknown as Transporter);

export const sendMailQueue = new Queue("send-mail", queueOptions);

const sendMailQueueEvents = new QueueEvents("send-mail", queueOptions);

sendMailQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );

    try {
      logger.info("sendMail: done sending email");
    } catch (err) {
      logger.error(`sendMailQueueEvents.completed ${JSON.stringify(err)}`);
    }
  }
);

sendMailQueueEvents.on("stalled", async (result: { jobId: string }) => {
  logger.info(`jobId ${result.jobId} stalled: Marking audio as error`);

  try {
    const job = await sendMailQueue.getJob(result.jobId);
    if (job) {
      logger.info("send email");
    }
  } catch (err) {
    logger.error(`sendMailQueueEvents.stalled ${JSON.stringify(err)}`);
  }
});

sendMailQueueEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

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
      email
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
