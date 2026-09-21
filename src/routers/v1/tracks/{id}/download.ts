import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import filenamify from "filenamify";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { logger } from "../../../../logger";
import { assertSupportedDownloadFormat } from "../../../../utils/audioFormats";
import { AppError } from "../../../../utils/error";
import { presignZip, streamZip, zipExists } from "../../../../utils/minio";
import {
  FormatOptions,
  basicTrackGroupInclude,
  findTrackPurchaseAndVoidToken,
  findTrackPurchaseBasedOnTokenAndUpdate,
} from "../../../../utils/trackGroup";
import { cleanHeaderValue } from "../../../../utils/validate-http-headers";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackId }: { id?: string } = req.params;
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
      let track;

      if (token && email) {
        logger.info(
          `trackId: ${trackId} being downloaded with a purchase token, ${email}, ${token}`
        );
        const tokenUser = await prisma.user.findFirst({
          where: { email },
        });

        if (tokenUser) {
          try {
            track = await findTrackPurchaseBasedOnTokenAndUpdate(
              Number(trackId),
              token,
              tokenUser.id
            );
          } catch (e) {
            if (!req.user) {
              throw e;
            }
            logger.info(
              `trackId: ${trackId} purchase token didn't resolve for ${email}, falling back to the session`
            );
          }
        } else if (!req.user) {
          logger.info(`trackId: ${trackId} no user found for ${email}`);
        }
      }

      if (!track && req.user) {
        const user = req.user;

        if (!user.isAdmin) {
          const purchase = await findTrackPurchaseAndVoidToken(
            Number(trackId),
            user
          );

          track = purchase.track;
        } else {
          logger.info(`trackId: ${trackId} being downloaded by admin`);
          track = await prisma.track.findFirst({
            where: {
              id: Number(trackId),
            },
            include: {
              trackGroup: basicTrackGroupInclude,
            },
          });
        }
      }

      if (!track) {
        throw new AppError({
          httpCode: 404,
          description: "No track found",
        });
      }

      logger.info(`trackId: ${trackId} Found a track, preparing download`);

      logger.info("checking if track already zipped");
      if (!(await zipExists("track", track.id, format))) {
        logger.info("Track not zipped");
        throw new AppError({
          httpCode: 400,
          description: "Need to generate track folder first",
        });
      }

      const title = cleanHeaderValue(
        filenamify(
          `${track.trackGroup.profile.name} - ${track.title ?? "track"}`
        )
      );

      // Prefer handing the browser a short-lived presigned storage URL so
      // the zip bytes don't flow through this server (egress costs). Falls
      // back to piping the file when presigning isn't available (e.g. local
      // MinIO without a browser-reachable endpoint).
      const presignedUrl = await presignZip("track", track.id, format, {
        downloadFilename: `${title}.zip`,
        contentType: "application/zip",
      });

      if (presignedUrl) {
        logger.info(
          `trackId: ${trackId} responding with presigned download URL`
        );
        return res.json({ result: { url: presignedUrl } });
      }

      logger.info(`downloading ${title}.zip`);
      res.attachment(`${title}.zip`);

      const stream = await streamZip("track", track.id, format);

      if (!stream) {
        throw new AppError({
          httpCode: 500,
          description: `Remote file not found for track zip ${track.id}/${format}`,
        });
      }

      stream.pipe(res);
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Downloads a track file if the user has permission",
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
          "A JSON body with a short-lived presigned download URL ({ result: { url } }), or the zip bytes themselves when presigning is unavailable",
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
