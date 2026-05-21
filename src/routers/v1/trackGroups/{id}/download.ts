import prisma from "@mirlo/prisma";
import contentDisposition from "content-disposition";
import { NextFunction, Request, Response } from "express";
import filenamify from "filenamify";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { logger } from "../../../../logger";
import { startGeneratingZip } from "../../../../queues/album-queue";
import { AppError } from "../../../../utils/error";
import { presignZip, statZip, streamZip } from "../../../../utils/minio";
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
      format = "flac",
    } = req.query as {
      format?: FormatOptions;
      email: string;
      token: string;
    };

    try {
      let trackGroup;

      if (req.user) {
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
      } else {
        logger.info(
          `trackGroupId: ${trackGroupId} being downloaded by a non-logged in user, ${email}, ${token}`
        );
        const user = await prisma.user.findFirst({
          where: { email },
        });

        if (user) {
          trackGroup = await findPurchaseBasedOnTokenAndUpdate(
            Number(trackGroupId),
            token,
            user?.id
          );
        }
      }

      if (!trackGroup) {
        res.status(404).json({
          error: "No trackGroup found",
        });
        return next();
      }

      logger.info(
        `trackGroupId: ${trackGroupId} Found a trackgroup, preparing download`
      );

      try {
        logger.info("checking if trackgroup already zipped");
        // FIXME Our controllers shouldn't have to care about the type of stat.
        const { backblazeStat, minioStat } = await statZip(
          "trackGroup",
          trackGroup.id,
          format
        );
        if (!backblazeStat && !minioStat) {
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
      } catch (e) {
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

      try {
        const originalTitle = `${trackGroup.artist.name} - ${trackGroup.title ?? "album"}`;
        const asciiTitle = filenamify(originalTitle);

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
          await prisma.trackGroupDownload.create({
            data: {
              trackGroupId: trackGroup.id,
              userId: req.user?.id ?? null,
            },
          });
          return res.json({ result: { url: presignedUrl } });
        }

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          contentDisposition(`${asciiTitle}.zip`, { type: "attachment" })
        );

        const stream = await streamZip("trackGroup", trackGroup.id, format);

        if (stream) {
          await prisma.trackGroupDownload.create({
            data: {
              trackGroupId: trackGroup.id,
              userId: req.user?.id ?? null,
            },
          });
          stream.pipe(res);
        } else {
          throw new AppError({
            httpCode: 500,
            description: `Remote file not found for trackgroup zip ${trackGroup.id}/${format}`,
          });
        }
      } catch (e) {
        next(e);
      }

      return;
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
