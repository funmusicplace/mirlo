import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../../auth/passport";
import { serializeFont } from "../../../../../../../serializers/font";
import {
  MAX_FILES_PER_FONT,
  MAX_FONT_FILE_BYTES,
  addFontFiles,
  readFontUpload,
} from "../../../../../../../utils/font";

export default function () {
  const operations = {
    POST: [
      userAuthenticated,
      userHasPermission("admin"),
      busboy({
        limits: { fileSize: MAX_FONT_FILE_BYTES, files: MAX_FILES_PER_FONT },
      }),
      POST,
    ],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      const font = await addFontFiles(
        req.params.fontId,
        await readFontUpload(req)
      );
      return res.status(200).json({ result: serializeFont(font) });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Adds weights or styles to a font",
    description: `Same file rules as creating a font. A font holds at most ${MAX_FILES_PER_FONT} files.`,
    parameters: [
      {
        in: "path",
        name: "fontId",
        required: true,
        type: "string",
      },
      {
        in: "formData",
        name: "upload",
        type: "file",
        required: true,
        description: "A font file; repeat the field for each file",
      },
    ],
    responses: {
      200: {
        description: "The font with its new files",
        schema: {
          type: "object",
          properties: { result: { $ref: "#/definitions/InstanceFont" } },
        },
      },
      400: {
        description:
          "No file, a file that is not a font, a font collection, a font whose license forbids embedding, a weight and style the font already has, or too many files",
      },
      404: {
        description: "Unknown font",
      },
      413: {
        description: "A file is too large",
      },
    },
  };

  return operations;
}
