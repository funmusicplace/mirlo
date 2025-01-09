import { NextFunction, Request, Response } from "express";
import {
  backblazeClient,
  fileExistCheckBackblaze,
  getBufferFromBackblaze,
  getBufferFromMinio,
} from "./utils/minio";
import { minioClient } from "./utils/minio";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import logger from "./logger";

export const serveStatic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let minioStat;

  const backblazeStat = await fileExistCheckBackblaze(
    req.params.bucket,
    req.params.filename
  );

  // If the object doesn't exist on backblaze we check in minio
  if (!backblazeStat) {
    logger.error(
      `Error fetching static file from backblaze, checking minio: ${req.params.bucket}/${req.params.filename}`
    );
    minioStat = await minioClient.statObject(
      req.params.bucket,
      req.params.filename
    );
  }

  if (!backblazeStat && !minioStat) {
    res.status(404);
    next();
    return;
  }

  // Cache assets for 1 week
  res.setHeader(
    "Cache-Control",
    "public, max-age=604800, stale-while-revalidate=604800"
  );
  const etag = `"${backblazeStat?.ETag ?? minioStat?.etag}"`;
  res.setHeader("ETag", etag);

  // when If-None-Match is provided, only return the object if the etag has changed
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match
  const ifNoneMatch = req.header("If-None-Match");
  if (ifNoneMatch && ifNoneMatch.includes(etag)) {
    // if the object is unchanged, return 304 (not modified) with no body
    res.status(304);
    res.send(null);
    next();
    return;
  }

  try {
    if (backblazeStat) {
      const { buffer } = await getBufferFromBackblaze(
        req.params.bucket,
        req.params.filename
      );

      res.end(buffer, "binary");
    } else {
      const { buffer } = await getBufferFromMinio(
        minioClient,
        req.params.bucket,
        req.params.filename
      );

      res.end(buffer, "binary");
    }

    return;
  } catch (e) {
    console.error("error", e);
    res.status(400);
  }
  next();
};
