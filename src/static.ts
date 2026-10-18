import { NextFunction, Request, Response } from "express";

import {
  getBufferBasedOnStat,
  getImagesBucket,
  imageContentType,
  statFile,
} from "./utils/minio";

const SVG_CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; sandbox";

const contentTypeFor = (filename: string, storedContentType?: string) =>
  imageContentType(filename) ??
  (storedContentType?.startsWith("image/") &&
  storedContentType !== "image/svg+xml"
    ? storedContentType
    : undefined);

export const serveStatic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bucket = req.params.bucket;
  if (bucket !== getImagesBucket()) {
    res.status(404);
    next();
    return;
  }
  // The object key is everything after the bucket segment. It can't be a
  // single route param because keys contain slashes
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  const contentType = contentTypeFor(
    filename,
    backblazeStat?.ContentType ??
      (minioStat?.metaData?.["content-type"] as string | undefined)
  );
  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }
  if (contentType === "image/svg+xml") {
    res.setHeader("Content-Security-Policy", SVG_CONTENT_SECURITY_POLICY);
  }

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
