import { Request, Response } from "express";
import { fromFile } from "file-type";
import { Logger } from "winston";

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
  logger?: Logger,
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
