import { NextFunction, Request, Response } from "express";

import {
  getBufferFromStorage,
  getImagesBucket,
  imageContentType,
  statFile,
} from "./utils/storage";

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

  const stat = await statFile(bucket, filename);
  if (!stat) {
    res.status(404);
    next();
    return;
  }

  // Cache assets for 1 week
  res.setHeader(
    "Cache-Control",
    "public, max-age=604800, stale-while-revalidate=604800"
  );
  const etag = stat.ETag?.startsWith('"') ? stat.ETag : `"${stat.ETag}"`;
  res.setHeader("ETag", etag);
  res.setHeader("X-Content-Type-Options", "nosniff");
  const contentType = contentTypeFor(filename, stat.ContentType);
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
    const { buffer } = await getBufferFromStorage(bucket, filename);

    res.end(buffer, "binary");

    return;
  } catch (e) {
    console.error("error", e);
    res.status(400);
  }
  next();
};
