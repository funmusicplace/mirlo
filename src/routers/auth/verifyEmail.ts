import prisma from "@mirlo/prisma";
import { Job } from "bullmq";
import { NextFunction, Request, Response } from "express";

import { sendMail } from "../../jobs/send-mail";
import logger from "../../logger";
import { AppError } from "../../utils/error";
import { getClient } from "../../utils/getClient";
import { findOrCreateUserBasedOnEmail } from "../../utils/user";

import { setTokens } from "./utils";

const generate = (n: number, chunks = 0, separator = " "): string => {
  var add = 1,
    max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

  var out;
  if (n > max) {
    out = generate(max) + generate(n - max);
  } else {
    max = Math.pow(10, n + add);
    var min = max / 10; // Math.pow(10, n) basically
    var number = Math.floor(Math.random() * (max - min + 1)) + min;

    out = ("" + number).substring(add);
  }

  if (chunks > 0 && n > chunks) {
    // Insert separator every chunks characters
    const instead = [];
    for (let i = 0; i < out.length; i++) {
      if (i > 0 && i % chunks === 0) instead.push(separator);
      instead.push(out[i]);
    }

    return instead.join("");
  }

  return out;
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  let { email, code } = req.body;

  logger.info(`auth/verifyEmail: verifying email ${email}`);
  if (!email) {
    return next(
      new AppError({
        httpCode: 400,
        description: "Email must be supplied",
      })
    );
  }
  try {
    email = email.toLowerCase().trim();
    code = code?.toString().trim().replace(/ /g, "");

    if (code) {
      logger.info(`auth/verifyEmail: verifying code for email ${email}`);
      // If a code is provided, we send
      const verification = await prisma.emailVerification.findFirst({
        where: {
          email,
          token: code,
        },
      });
      if (!verification) {
        logger.warn(
          `auth/verifyEmail: no matching verification code found for email ${email}`
        );
        throw new AppError({
          httpCode: 400,
          description: "Invalid verification code",
        });
      } else if (
        verification.tokenExpiration &&
        verification.tokenExpiration < new Date()
      ) {
        logger.warn(
          `auth/verifyEmail: expired verification code used for email ${email} (expired ${verification.tokenExpiration.toISOString()})`
        );
        throw new AppError({
          httpCode: 400,
          description:
            "This verification code has expired. Please request a new one.",
        });
      } else {
        await prisma.emailVerification.delete({
          where: {
            id: verification.id,
          },
        });
        const { user } = await findOrCreateUserBasedOnEmail(email);

        if (user) {
          if (user.emailConfirmationToken || user.emailConfirmationExpiration) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                emailConfirmationToken: null,
                emailConfirmationExpiration: null,
              },
            });
          }

          setTokens(res, { email: user.email, id: user.id });
          res.json({
            message: "Success! Email verified.",
            userId: user?.id,
          });
        } else {
          throw new AppError({
            httpCode: 500,
            description: "Could not find or create user",
          });
        }
      }
    } else {
      // If no code is provided, we send a verification email to the provided email
      const generatedCode = generate(6, 2, " ");
      await prisma.emailVerification.upsert({
        where: { email },
        create: {
          email,
          token: generatedCode.replace(/ /g, ""),
        },
        update: {
          token: generatedCode.replace(/ /g, ""),
          tokenExpiration: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      });
      const client = await getClient();
      logger.info(`auth/verifyEmail: sending verification email ${email}`);

      try {
        await sendMail({
          data: {
            template: "verify-email",
            message: {
              to: email,
            },
            locals: {
              host: process.env.API_DOMAIN,
              client: client.id,
              code: generatedCode,
              contextSubject: req.body.contextSubject,
            },
          },
        } as Job);
      } catch (e) {
        logger.error(
          `auth/verifyEmail: failed to send verification email to ${email}: ${e}`
        );
        throw new AppError({
          httpCode: 500,
          description:
            "We couldn't send the verification email. Please try again in a moment.",
        });
      }
      return res.json({ message: "Success! Verification email sent." });
    }
  } catch (e) {
    next(e);
  }
};

export default verifyEmail;
