import { NextFunction, Request, Response } from "express";
import {
  backblazeClient,
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
  let backblazeStat;
  let minioStat;
  logger.info(`static: ${req.params.bucket}/${req.params.filename}`);

  // FIXME: someone who's better at devops than me will have to figure out
  // how we can serve these directly from minio
  try {
    backblazeStat = await backblazeClient.send(
      new HeadObjectCommand({
        Bucket: req.params.bucket,
        Key: req.params.filename,
      })
    );
    // If the object doesn't exist on backblaze we check in minio
    if (!backblazeStat) {
      minioStat = await minioClient.statObject(
        req.params.bucket,
        req.params.filename
      );
    }
  } catch (error) {
    console.error("error stat", error);
    res.status(404);
    next();
    return;
  }

  // Cache minio assets for 1 week
  res.setHeader(
    "Cache-Control",
    "public, max-age=604800, stale-while-revalidate=604800"
  );
  const etag = `"${backblazeStat.ETag ?? minioStat?.etag}"`;
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
