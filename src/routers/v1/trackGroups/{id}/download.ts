import prisma from "@mirlo/prisma";
import contentDisposition from "content-disposition";
import { NextFunction, Request, Response } from "express";
import filenamify from "filenamify";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { logger } from "../../../../logger";
import { startGeneratingZip } from "../../../../queues/album-queue";
import { assertSupportedDownloadFormat } from "../../../../utils/audioFormats";
import { AppError } from "../../../../utils/error";
import { presignZip, streamZip, zipExists } from "../../../../utils/minio";
import {
  FormatOptions,
  basicTrackGroupInclude,
  findPurchaseAndVoidToken,
  findPurchaseBasedOnTokenAndUpdate,
} from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const {
      email,
      token,
      format: requestedFormat = "flac",
    } = req.query as {
      format?: FormatOptions;
      email: string;
      token: string;
    };

    try {
      const format = assertSupportedDownloadFormat(requestedFormat);
      let trackGroup;

      if (token && email) {
        logger.info(
          `trackGroupId: ${trackGroupId} being downloaded with a purchase token, ${email}, ${token}`
        );
        const tokenUser = await prisma.user.findFirst({
          where: { email },
        });

        if (tokenUser) {
          try {
            trackGroup = await findPurchaseBasedOnTokenAndUpdate(
              Number(trackGroupId),
              token,
              tokenUser.id
            );
          } catch (e) {
            if (!req.user) {
              throw e;
            }
            logger.info(
              `trackGroupId: ${trackGroupId} purchase token didn't resolve for ${email}, falling back to the session`
            );
          }
        } else if (!req.user) {
          logger.info(
            `trackGroupId: ${trackGroupId} no user found for ${email}`
          );
        }
      }

      if (!trackGroup && req.user) {
        const user = req.user;

        if (!user.isAdmin) {
          const purchase = await findPurchaseAndVoidToken(
            Number(trackGroupId),
            user
          );

          trackGroup = purchase.trackGroup;
        } else {
          logger.info(
            `trackGroupId: ${trackGroupId} being downloaded by admin`
          );
          trackGroup = await prisma.trackGroup.findFirst({
            where: {
              id: Number(trackGroupId),
            },
            ...basicTrackGroupInclude,
          });
        }
      }

      if (!trackGroup) {
        throw new AppError({
          httpCode: 404,
          description: "No trackGroup found",
        });
      }

      logger.info(
        `trackGroupId: ${trackGroupId} Found a trackgroup, preparing download`
      );

      logger.info("checking if trackgroup already zipped");
      if (!(await zipExists("trackGroup", trackGroup.id, format))) {
        logger.info("trackGroup doesn't exist yet, start generating it");
        const jobId = await startGeneratingZip(
          trackGroup,
          trackGroup.tracks,
          format
        );
        return res.json({
          message: "We've started generating the album",
          result: { jobId },
        });
      }

      const originalTitle = `${trackGroup.profile.name} - ${trackGroup.title ?? "album"}`;
      const asciiTitle = filenamify(originalTitle);

      // Takes the id rather than closing over `trackGroup`, which is a `let`
      // assigned down several branches and so loses its narrowing in a closure.
      const recordDownload = (id: number) =>
        prisma.trackGroupDownload.create({
          data: {
            trackGroupId: id,
            userId: req.user?.id ?? null,
          },
        });

      // Prefer handing the browser a short-lived presigned storage URL so
      // the zip bytes don't flow through this server (egress costs). Falls
      // back to piping the file when presigning isn't available (e.g. local
      // MinIO without a browser-reachable endpoint).
      const presignedUrl = await presignZip(
        "trackGroup",
        trackGroup.id,
        format,
        {
          downloadFilename: `${asciiTitle}.zip`,
          contentType: "application/zip",
        }
      );

      if (presignedUrl) {
        logger.info(
          `trackGroupId: ${trackGroupId} responding with presigned download URL`
        );
        await recordDownload(trackGroup.id);
        return res.json({ result: { url: presignedUrl } });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        contentDisposition(`${asciiTitle}.zip`, { type: "attachment" })
      );

      const stream = await streamZip("trackGroup", trackGroup.id, format);

      if (!stream) {
        throw new AppError({
          httpCode: 500,
          description: `Remote file not found for trackgroup zip ${trackGroup.id}/${format}`,
        });
      }

      await recordDownload(trackGroup.id);
      stream.pipe(res);
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Downloads a trackGroup file if the user has permission",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description:
          "A JSON body with a short-lived presigned download URL ({ result: { url } }), a JSON body with a generation job id when the zip isn't built yet ({ result: { jobId } }), or the zip bytes themselves when presigning is unavailable",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
