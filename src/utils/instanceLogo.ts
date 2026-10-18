import { randomUUID } from "crypto";

import prisma from "@mirlo/prisma";
import { Request } from "express";
import sharp from "sharp";

import logger from "../logger";

import { AppError, HttpCode } from "./error";
import { removeImagesByType, uploadOptimizedImageByType } from "./minio";
import { stripNullBytes } from "./sanitize";
import { SettingsType } from "./settings";
import { isSvgMarkup, sanitizeSvg } from "./svgSanitizer";

export const MAX_LOGO_BYTES = 200 * 1024;
const MAX_LOGO_PNG_WIDTH = 600;
const MAX_LOGO_PNG_HEIGHT = 200;
const MAX_LOGO_PNG_INPUT_PIXELS = 40_000_000;
const MAX_LOGO_FILENAME_LENGTH = 255;
const LOGO_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export const INSTANCE_LOGO_FIELDS = {
  main: "logoId",
  mobile: "mobileLogoId",
} as const;

export type InstanceLogoKind = keyof typeof INSTANCE_LOGO_FIELDS;

type LogoUpload = { buffer: Buffer; filename: string };

type StoredLogo = Awaited<ReturnType<typeof storeLogoFile>>;

const rejectFormat = () =>
  new AppError({
    httpCode: HttpCode.BAD_REQUEST,
    description: "The logo must be an SVG or PNG file.",
  });

const rejectIncompleteUpload = () =>
  new AppError({
    httpCode: HttpCode.BAD_REQUEST,
    description: "The upload did not complete. Try again.",
  });

export const readLogoUpload = (req: Request) =>
  new Promise<LogoUpload>((resolve, reject) => {
    if (!req.busboy) {
      reject(rejectFormat());
      return;
    }
    let upload: LogoUpload | undefined;
    let isTooLarge = false;

    req.on("close", () => {
      if (!req.complete) {
        reject(rejectIncompleteUpload());
      }
    });
    req.busboy.on("file", (_fieldname, fileStream, fileInfo) => {
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      fileStream.on("limit", () => {
        isTooLarge = true;
      });
      fileStream.on("error", () => reject(rejectIncompleteUpload()));
      fileStream.on("end", () => {
        upload = {
          buffer: Buffer.concat(chunks),
          filename: (stripNullBytes(fileInfo.filename) ?? "").slice(
            0,
            MAX_LOGO_FILENAME_LENGTH
          ),
        };
      });
    });
    req.busboy.on("error", () => reject(rejectIncompleteUpload()));
    req.busboy.on("close", () => {
      if (isTooLarge) {
        reject(
          new AppError({
            httpCode: HttpCode.PAYLOAD_TOO_LARGE,
            description: `The logo must be ${MAX_LOGO_BYTES / 1024} KB or smaller.`,
          })
        );
      } else if (!upload) {
        reject(rejectFormat());
      } else {
        resolve(upload);
      }
    });
    req.pipe(req.busboy);
  });

export const processLogo = async (buffer: Buffer) => {
  if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    const { data, info } = await sharp(buffer, {
      limitInputPixels: MAX_LOGO_PNG_INPUT_PIXELS,
    })
      .resize({
        width: MAX_LOGO_PNG_WIDTH,
        height: MAX_LOGO_PNG_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true })
      .catch(() => {
        throw rejectFormat();
      });
    return {
      buffer: data,
      mimeType: "image/png",
      extension: "png",
      width: info.width,
      height: info.height,
    };
  }

  const text = buffer.toString("utf8").replace(/^﻿/, "");
  if (!isSvgMarkup(text)) {
    throw rejectFormat();
  }
  const { markup, width, height } = sanitizeSvg(text);
  return {
    buffer: Buffer.from(markup, "utf8"),
    mimeType: "image/svg+xml",
    extension: "svg",
    width,
    height,
  };
};

const removeInstanceLogoFiles = async (logoId: string) => {
  try {
    await removeImagesByType("instanceLogo", logoId);
  } catch (e) {
    logger.error(`Could not remove the files of instance logo ${logoId}`);
    logger.error(e);
  }
};

const deleteInstanceLogo = async (logoId: string) => {
  try {
    await prisma.instanceLogo.deleteMany({ where: { id: logoId } });
  } catch (e) {
    logger.error(`Could not delete instance logo ${logoId}`);
    logger.error(e);
    return;
  }
  await removeInstanceLogoFiles(logoId);
};

export const storeLogoFile = async (upload: LogoUpload) => {
  const { buffer, ...logo } = await processLogo(upload.buffer);
  const id = randomUUID();
  await uploadOptimizedImageByType(
    "instanceLogo",
    `${id}.${logo.extension}`,
    buffer,
    {
      contentType: logo.mimeType,
      cacheControl: LOGO_CACHE_CONTROL,
    }
  );
  return {
    data: { id, ...logo, originalFilename: upload.filename },
    discard: () => removeInstanceLogoFiles(id),
  };
};

export const attachInstanceLogos = async (
  settingsId: SettingsType["id"],
  logos: Partial<Record<InstanceLogoKind, StoredLogo>>,
  options: { onlyIfNoLogo?: boolean; tint?: boolean } = {}
) => {
  const entries = Object.entries(logos) as [InstanceLogoKind, StoredLogo][];
  const discardAll = () =>
    Promise.all(entries.map(([, logo]) => logo.discard()));
  let previousLogoIds: (string | null)[];
  try {
    previousLogoIds = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Settings" WHERE id = ${settingsId} FOR UPDATE`;
      const current = await tx.settings.findUniqueOrThrow({
        where: { id: settingsId },
      });
      if (options.onlyIfNoLogo && (current.logoId || current.mobileLogoId)) {
        return [];
      }
      for (const [, logo] of entries) {
        await tx.instanceLogo.create({ data: logo.data });
      }
      await tx.settings.update({
        where: { id: settingsId },
        data: {
          ...Object.fromEntries(
            entries.map(([kind, logo]) => [
              INSTANCE_LOGO_FIELDS[kind],
              logo.data.id,
            ])
          ),
          ...(options.tint && {
            settings: {
              ...current.settings,
              instanceCustomization: {
                ...current.settings?.instanceCustomization,
                tintLogo: true,
              },
            },
          }),
        },
      });
      return entries.map(([kind]) => current[INSTANCE_LOGO_FIELDS[kind]]);
    });
  } catch (e) {
    await discardAll();
    throw e;
  }
  if (previousLogoIds.length === 0) {
    await discardAll();
    return false;
  }
  for (const previousLogoId of previousLogoIds) {
    if (previousLogoId) {
      await deleteInstanceLogo(previousLogoId);
    }
  }
  return true;
};

export const replaceInstanceLogo = async (
  settingsId: SettingsType["id"],
  kind: InstanceLogoKind,
  upload: LogoUpload
) => {
  await attachInstanceLogos(settingsId, {
    [kind]: await storeLogoFile(upload),
  });
};

export const removeInstanceLogo = async (
  settingsId: SettingsType["id"],
  kind: InstanceLogoKind
) => {
  const settings = await prisma.settings.findUniqueOrThrow({
    where: { id: settingsId },
  });
  const logoId = settings[INSTANCE_LOGO_FIELDS[kind]];
  if (logoId) {
    await deleteInstanceLogo(logoId);
  }
};
