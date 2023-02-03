import { PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
import { pick } from "lodash";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import processFile, { processImage } from "../../../../../utils/process-file";

const prisma = new PrismaClient();

type Params = {
  trackGroupId: number;
  userId: number;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
    DELETE: [userAuthenticated, userHasPermission("owner"), DELETE],
  };

  async function PUT(req: Request, res: Response) {
    const { userId, trackGroupId } = req.params as unknown as Params;
    const data = req.body;
    const loggedInUser = req.user as User;
    console.log("data", data);
    try {
      const artist = await prisma.artist.findFirst({
        where: {
          userId: loggedInUser.id,
          id: Number(data.artistId),
        },
      });

      if (!artist) {
        res.json({
          error: "Artist must belong to user",
        });
        throw new Error("Artist must belong to user");
      }

      await prisma.trackGroup.updateMany({
        where: { id: Number(trackGroupId), artistId: artist.id },
        data: pick(data, [
          "title",
          "releaseDate",
          "published",
          "type",
          "about",
        ]),
      });
      console.log("files", req.body);
      const file = req.body.files.file;
      // TODO: Remove prior files
      // FIXME: Only allow uploading of one file.
      const fileResult = await processImage({ req, res })(file, trackGroupId);

      // trackgroup.set("cover", file.filename);

      res.json({ message: "Success" });
    } catch (error) {
      console.log("error", error);
      res.json({
        error: `TrackGroup with ID ${trackGroupId} does not exist in the database`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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

  async function DELETE(req: Request, res: Response) {
    const { id } = req.params;
    // FIXME: ensure trackGroup is owned by user
    const post = await prisma.trackGroup.delete({
      where: {
        id: Number(id),
      },
    });
    res.json(post);
  }

  DELETE.apiDoc = {
    summary: "Deletes a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
