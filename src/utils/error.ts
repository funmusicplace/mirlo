import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`ERROR: ${req.method} ${req.path}`, err);
  if (err instanceof PrismaClientKnownRequestError) {
    res
      .status(400)
      .json({
        error: `Something went wrong with the data supplied. Admin should check the logs`,
      });
  }
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message });
  } else if (res.statusCode === 429) {
    res.json({ error: "Too many requests" });
  } else {
    res.status(err.status ?? 500).json({ error: err.errors });
  }
  next();
};

export default errorHandler;
