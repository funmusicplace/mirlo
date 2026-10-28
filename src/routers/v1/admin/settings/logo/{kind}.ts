import busboy from "connect-busboy";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import {
  INSTANCE_LOGO_FIELDS,
  InstanceLogoKind,
  MAX_LOGO_BYTES,
  readLogoUpload,
  removeInstanceLogo,
  replaceInstanceLogo,
} from "../../../../../utils/instanceLogo";
import { respondWithInstanceSettings } from "../../../../../utils/instanceSettingsResponse";
import { getSiteSettings } from "../../../../../utils/settings";

const parseKind = (req: Request) => req.params.kind as InstanceLogoKind;

const KIND_PARAMETER = {
  in: "path",
  name: "kind",
  required: true,
  type: "string",
  enum: Object.keys(INSTANCE_LOGO_FIELDS),
  description:
    "main for the logo shown on large screens, mobile for the compact logo shown on small screens",
};

export default function () {
  const operations = {
    PUT: [
      userAuthenticated,
      userHasPermission("admin"),
      busboy({ limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }),
      PUT,
    ],
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    try {
      const kind = parseKind(req);
      const upload = await readLogoUpload(req);
      const settings = await getSiteSettings();
      await replaceInstanceLogo(settings.id, kind, upload);
      return respondWithInstanceSettings(res);
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Uploads an instance logo shown in the site header",
    description:
      "Accepts one SVG or PNG file of at most 200 KB. SVG files are refused when they contain anything other than shapes and styles (scripts, external links, embedded content). PNG files are scaled down to fit 600x200. Replaces the previous logo of that kind and returns the public instance settings.",
    parameters: [
      KIND_PARAMETER,
      {
        in: "formData",
        name: "upload",
        type: "file",
        required: true,
        description: "The SVG or PNG logo",
      },
    ],
    responses: {
      200: {
        description: "The public instance settings with the new logo",
      },
      400: {
        description:
          "Unknown logo kind, incomplete upload, or a file that is not an accepted SVG or PNG",
      },
      413: {
        description: "The file is larger than 200 KB",
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      const kind = parseKind(req);
      const settings = await getSiteSettings();
      await removeInstanceLogo(settings.id, kind);
      return respondWithInstanceSettings(res);
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Removes an instance logo",
    description:
      "Without a main logo the header shows the instance name; without a mobile logo small screens use the main logo. Returns the public instance settings.",
    parameters: [KIND_PARAMETER],
    responses: {
      200: {
        description: "The public instance settings without that logo",
      },
      400: {
        description: "Unknown logo kind",
      },
    },
  };

  return operations;
}
