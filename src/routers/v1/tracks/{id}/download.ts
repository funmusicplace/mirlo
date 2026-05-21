import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import filenamify from "filenamify";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { logger } from "../../../../logger";
import { AppError } from "../../../../utils/error";
import { presignZip, statZip, streamZip } from "../../../../utils/minio";
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
      format = "flac",
    } = req.query as {
      format?: FormatOptions;
      email: string;
      token: string;
    };

    try {
      let track;

      if (req.user) {
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
      } else {
        logger.info(
          `trackId: ${trackId} being downloaded by a non-logged in user, ${email}, ${token}`
        );
        const user = await prisma.user.findFirst({
          where: { email },
        });

        if (user) {
          track = await findTrackPurchaseBasedOnTokenAndUpdate(
            Number(trackId),
            token,
            user?.id
          );
        }
      }

      if (!track) {
        res.status(404).json({
          error: "No track found",
        });
        return next();
      }

      logger.info(`trackId: ${trackId} Found a track, preparing download`);

      try {
        logger.info("checking if track already zipped");
        // FIXME: our controller shouldn't have to know about backblaze
        const { backblazeStat, minioStat } = await statZip(
          "track",
          track.id,
          format
        );
        if (!backblazeStat && !minioStat) {
          logger.info("Track not zipped");
          throw new AppError({
            httpCode: 400,
            description: "Need to generate track folder first",
          });
        }
      } catch (e) {
        throw new AppError({
          httpCode: 400,
          description: "Need to generate track folder first",
        });
      }

      try {
        const title = cleanHeaderValue(
          filenamify(
            `${track.trackGroup.artist.name} - ${track.title ?? "track"}`
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
        res.set("Content-Disposition", `attachment; filename="${title}.zip"`);

        const stream = await streamZip("track", track.id, format);

        if (stream) {
          stream.pipe(res);
        } else {
          throw new AppError({
            httpCode: 500,
            description: `Remote file not found for track zip ${track.id}/${format}`,
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
