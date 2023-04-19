import { NextFunction, Request, Response } from "express";
import * as Minio from "minio";
import { finalCoversBucket, getObjectFromMinio } from "./utils/minio";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_PORT = 9000,
} = process.env;

const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: +MINIO_PORT,
  useSSL: false,
  // useSSL: NODE_ENV !== "development",
  accessKey: MINIO_ROOT_USER,
  secretKey: MINIO_ROOT_PASSWORD,
});

export const serveStatic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let stat;
  // FIXME: someone who's better at devops than me will have to figure out
  // how we can serve these directly from minio
  try {
    stat = await minioClient.statObject(finalCoversBucket, req.params.filename);
  } catch (error) {
    console.error("error stat", error);
    res.status(404);
    next();
    return;
  }

  try {
    const { buffer } = await getObjectFromMinio(
      minioClient,
      finalCoversBucket,
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
