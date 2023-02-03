import winston from "winston";
import path from "path";
import nodemailer from "nodemailer";
import sendgrid from "nodemailer-sendgrid";
import Email from "email-templates";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "cleanup" },
  transports: [
    new winston.transports.Console({
      level: "debug",
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
  ],
});

const viewsDir = path.join(__dirname, "../../emails");

/**
 * Cleanup incoming folder and more (later)
 */

const sendMail = async (job: any) => {
  try {
    if (process.env.SENDGRID_API_KEY) {
      const email = new Email({
        message: {
          from: `"Resonate" <${
            process.env.SENDGRID_SENDER ?? "members@resonate.coop"
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
        transport: nodemailer.createTransport(
          sendgrid({
            apiKey: process.env.SENDGRID_API_KEY,
          })
        ),
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

      logger.info("Email sent");
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
};

export default sendMail;
