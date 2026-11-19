import { Readable } from "stream";

import { Request, Response } from "express";
import { fromFile, fromStream } from "file-type";
import { Logger } from "winston";

import { AppError, HttpCode } from "./error";
import { stripNullBytes } from "./sanitize";

const MAX_UPLOAD_FILENAME_LENGTH = 255;

export type BufferedUpload = { buffer: Buffer; filename: string };

type BufferedUploads = {
  uploads: BufferedUpload[];
  tooLargeFilename?: string;
  hasTooManyFiles: boolean;
};

const rejectIncompleteUpload = () =>
  new AppError({
    httpCode: HttpCode.BAD_REQUEST,
    description: "The upload did not complete. Try again.",
  });

export const readBufferedUploads = (req: Request) =>
  new Promise<BufferedUploads | undefined>((resolve, reject) => {
    const { busboy } = req;
    if (!busboy) {
      resolve(undefined);
      return;
    }
    const result: BufferedUploads = { uploads: [], hasTooManyFiles: false };

    req.on("close", () => {
      if (!req.complete) {
        reject(rejectIncompleteUpload());
      }
    });
    busboy.on("filesLimit", () => {
      result.hasTooManyFiles = true;
    });
    busboy.on("file", (_fieldname, fileStream, fileInfo) => {
      const filename = (stripNullBytes(fileInfo.filename) ?? "").slice(
        0,
        MAX_UPLOAD_FILENAME_LENGTH
      );
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      fileStream.on("limit", () => {
        result.tooLargeFilename = filename;
      });
      fileStream.on("error", () => reject(rejectIncompleteUpload()));
      fileStream.on("end", () => {
        result.uploads.push({ buffer: Buffer.concat(chunks), filename });
      });
    });
    busboy.on("error", () => reject(rejectIncompleteUpload()));
    busboy.on("close", () => resolve(result));
    req.pipe(busboy);
  });

export type APIContext = {
  req: Request;
  res: Response;
};

export type APIFile = {
  originalname: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
};

export const checkFileType = async (
  ctx: APIContext,
  file: APIFile,
  mimeTypes: string[],
  logger?: Logger
) => {
  const { path: filepath } = file;
  const type = await fromFile(filepath);
  const mime = type !== null && type !== undefined ? type.mime : file.mimetype;
  const isSupported = mimeTypes.includes(mime);

  if (!isSupported) {
    logger?.error("Not a supported format");
    ctx.res.status(400);
    throw `File type not supported: ${mime}`;
  }

  return { filepath, ext: type?.ext, mimetype: type?.mime };
};

export const checkFileTypeFromStream = async (
  ctx: APIContext,
  stream: Readable,
  mimeTypes: string[],
  logger?: Logger
) => {
  const type = await fromStream(stream);
  if (!type) {
    ctx.res.status(400);
    throw `File type not supported`;
  }
  const isSupported = mimeTypes.includes(type.mime);

  if (!isSupported) {
    logger?.error("Not a supported format");
    ctx.res.status(400);
    throw `File type not supported: ${type.mime}`;
  }

  return type;
};
