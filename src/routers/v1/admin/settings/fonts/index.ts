import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import { serializeFont } from "../../../../../serializers/font";
import {
  MAX_FILES_PER_FONT,
  MAX_FONT_FILE_BYTES,
  MAX_FONTS,
  createFont,
  listFonts,
  readFontUpload,
} from "../../../../../utils/font";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [
      userAuthenticated,
      userHasPermission("admin"),
      busboy({
        limits: { fileSize: MAX_FONT_FILE_BYTES, files: MAX_FILES_PER_FONT },
      }),
      POST,
    ],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const fonts = await listFonts();
      return res.status(200).json({ results: fonts.map(serializeFont) });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Lists the fonts of the instance library",
    responses: {
      200: {
        description: "The fonts with their files",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: { $ref: "#/definitions/InstanceFont" },
            },
          },
        },
      },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      const font = await createFont(await readFontUpload(req));
      return res.status(200).json({ result: serializeFont(font) });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Adds a font to the instance library",
    description: `Accepts 1 to ${MAX_FILES_PER_FONT} WOFF2, WOFF, TTF or OTF files of at most ${MAX_FONT_FILE_BYTES / 1024 / 1024} MB each, one per weight and style. The name, weight, style, covered scripts and the generic fallback (serif, sans serif, monospace...) are read from the files. The library holds at most ${MAX_FONTS} fonts.`,
    parameters: [
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
        description: "The new font",
        schema: {
          type: "object",
          properties: { result: { $ref: "#/definitions/InstanceFont" } },
        },
      },
      400: {
        description:
          "No file, too many files, a file that is not a font, a font collection, a font whose license forbids embedding, two files covering the same weight and style, or a full library",
      },
      413: {
        description: "A file is too large",
      },
    },
  };

  return operations;
}
