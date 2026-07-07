import { NextFunction, Request, Response } from "express";

import { getBufferBasedOnStat, statFile } from "./utils/minio";

export const serveStatic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bucket = req.params.bucket;
  // The object key is everything after the bucket segment. It can't be a
  // single route param because consolidated-mode keys contain slashes
  // (e.g. trackgroup-covers/<id>-x600.webp).
  let filename: string;
  try {
    filename = decodeURIComponent(req.path.slice(1));
  } catch {
    res.status(404);
    next();
    return;
  }

  if (!filename) {
    res.status(404);
    next();
    return;
  }

  const { backblazeStat, minioStat } = await statFile(bucket, filename);
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
    const buffer = await getBufferBasedOnStat(bucket, filename, backblazeStat);

    res.end(buffer, "binary");

    return;
  } catch (e) {
    console.error("error", e);
    res.status(400);
  }
  next();
};
