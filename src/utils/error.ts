import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`ERROR: ${req.method} ${req.path}`, err);
  if (err instanceof PrismaClientValidationError) {
    const messageStrings = err.message.split("\n");

    res.status(400).json({
      error: messageStrings[messageStrings.length - 1],
    });
  } else if (err instanceof PrismaClientKnownRequestError) {
    console.error("err", err.cause, err.name, err.code, err.meta);
    let message = `Something went wrong with the data supplied. Admin should check the logs`;

    if (err.meta && err.code === "P2002") {
      message = `Value is not unique: ${err.meta?.target}`;
    }
    res.status(400).json({
      error: message,
    });
  } else if (err instanceof MulterError) {
    res.status(400).json({ error: err.message });
  } else if (res.statusCode === 429) {
    res.json({ error: "Too many requests" });
  } else {
    res.status(err.status ?? 500).json({ error: err.errors });
  }
};

export default errorHandler;
