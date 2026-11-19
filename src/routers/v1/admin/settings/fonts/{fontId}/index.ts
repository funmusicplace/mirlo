import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { deleteFont } from "../../../../../../utils/font";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      await deleteFont(req.params.fontId);
      return res.status(200).json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a font and its files",
    description:
      "The text or titles that used the font go back to the default font.",
    parameters: [
      {
        in: "path",
        name: "fontId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The font was deleted",
      },
      404: {
        description: "Unknown font",
      },
    },
  };

  return operations;
}
