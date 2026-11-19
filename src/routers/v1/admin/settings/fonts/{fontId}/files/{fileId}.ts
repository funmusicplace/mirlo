import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../../auth/passport";
import { serializeFont } from "../../../../../../../serializers/font";
import { deleteFontFile } from "../../../../../../../utils/font";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      const font = await deleteFontFile(req.params.fontId, req.params.fileId);
      return res.status(200).json({ result: serializeFont(font) });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Removes one weight or style from a font",
    parameters: [
      {
        in: "path",
        name: "fontId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "fileId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The font without that file",
        schema: {
          type: "object",
          properties: { result: { $ref: "#/definitions/InstanceFont" } },
        },
      },
      400: {
        description: "The file is the last one of the font",
      },
      404: {
        description: "Unknown font or file",
      },
    },
  };

  return operations;
}
