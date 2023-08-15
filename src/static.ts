import { NextFunction, Request, Response } from "express";
import { getBufferFromMinio } from "./utils/minio";
import { minioClient } from "./utils/minio";

export const serveStatic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let stat;
  // FIXME: someone who's better at devops than me will have to figure out
  // how we can serve these directly from minio
  try {
    stat = await minioClient.statObject(req.params.bucket, req.params.filename);
  } catch (error) {
    console.error("error stat", error);
    res.status(404);
    next();
    return;
  }

  try {
    const { buffer } = await getBufferFromMinio(
      minioClient,
      req.params.bucket,
      req.params.filename
    );
    res.end(buffer, "binary");
    return;
  } catch (e) {
    console.error("error", e);
    res.status(400);
    return;
  }
  next();
};
