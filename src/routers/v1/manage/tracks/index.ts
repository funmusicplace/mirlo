import { NextFunction, Request, Response } from "express";
import { User } from "@mirlo/prisma/client";

import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { doesTrackGroupBelongToUser } from "../../../../utils/ownership";
import {
  getPresignedUploadUrl,
  incomingAudioBucket,
} from "../../../../utils/minio";
import { buildTrackStreamURL } from "../../../../queues/processTrackAudio";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, POST],
  };

  async function GET(req: Request, res: Response) {
    const loggedInUser = req.user as User;

    const tracks = await prisma.track.findMany({
      where: {
        trackGroup: {
          artist: {
            userId: loggedInUser.id,
          },
        },
      },
    });
    res.json(tracks);
  }

  GET.apiDoc = {
    summary: "Returns all tracks belonging to a user",
    parameters: [],
    responses: {
      200: {
        description: "A list of tracks",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Track",
          },
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const loggedInUser = req.user as User;

    const {
      title,
      trackGroupId,
      trackArtists,
      order,
      metadata,
      isPreview,
      lyrics,
      isrc,
      description,
      filename,
    } = req.body;
    try {
      await doesTrackGroupBelongToUser(Number(trackGroupId), loggedInUser);

      const allTracksOnAlbums = await prisma.track.findMany({
        where: {
          trackGroupId: Number(trackGroupId),
          deletedAt: null,
        },
        select: {
          allowMirloPromo: true,
          allowIndividualSale: true,
          minPrice: true,
          currency: true,
        },
      });

      let allowMirloPromo = false;
      if (allTracksOnAlbums.every((track) => track.allowMirloPromo)) {
        // Assume if all tracks in the group allow Mirlo promo, then the new track should also allow it
        allowMirloPromo = true;
      }
      let minPrice: number | null = null;
      let allowIndividualSale = false;
      if (allTracksOnAlbums.every((track) => track.allowIndividualSale)) {
        minPrice = Math.min(
          ...allTracksOnAlbums.map((track) => track.minPrice ?? 0)
        );
        allowIndividualSale = true;
      }

      const createdTrack = await prisma.track.create({
        data: {
          title,
          order,
          isPreview,
          metadata,
          lyrics,
          isrc,
          description,
          allowMirloPromo,
          allowIndividualSale,
          minPrice,
          currency: allTracksOnAlbums[0]?.currency,
          trackGroup: {
            connect: {
              id: Number(trackGroupId),
            },
          },
          trackArtists: {
            create: trackArtists,
          },
        },
      });

      const track = await prisma.track.findFirst({
        where: {
          id: createdTrack.id,
        },
        include: {
          trackGroup: true,
          trackArtists: true,
          audio: true,
        },
      });
      let uploadUrl = null;
      if (track && !track?.audio) {
        const audio = await prisma.trackAudio.upsert({
          create: {
            trackId: track.id,
            originalFilename: filename,
            fileExtension: filename?.split(".").pop() ?? undefined,
            url: buildTrackStreamURL(track.id),
            uploadState: "STARTED",
          },
          update: {
            trackId: track.id,
            originalFilename: filename,
            fileExtension: filename?.split(".").pop() ?? undefined,
            url: buildTrackStreamURL(track.id),
            uploadState: "STARTED",
          },
          where: {
            trackId: Number(track.id),
          },
        });
        uploadUrl = await getPresignedUploadUrl(incomingAudioBucket, audio.id);
      }
      res.json({ result: track, uploadUrl });
    } catch (e) {
      next(e);
    }
  }

  // FIXME: document POST

  return operations;
}
