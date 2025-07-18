import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

export enum HttpCode {
  OK = 200,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  NOT_ACCEPTABLE = 406,
}

interface AppErrorArgs {
  name?: string;
  httpCode: HttpCode;
  description: string;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly name: string;
  public readonly description: string;
  public readonly httpCode: HttpCode;
  public readonly isOperational: boolean = true;

  constructor(args: AppErrorArgs) {
    super(args.description);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = args.name || "Error";
    this.httpCode = args.httpCode;
    this.description = args.description;

    if (args.isOperational !== undefined) {
      this.isOperational = args.isOperational;
    }

    Error.captureStackTrace(this);
  }
}

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.httpCode >= 500) {
      console.error(
        "Found instance of AppError",
        req.path,
        req.method,
        err.httpCode,
        err.name,
        err.description
      );
    }
    return res.status(err.httpCode).json({
      error: err.message,
    });
  }

  // Errors we should probably know about
  console.error(
    `ERROR: ${req.method}: ${req.path} params: ${JSON.stringify(req.params)}`,
    err,
    err.captureStackTrace ? err.captureStackTrace() : ""
  );

  if (
    err instanceof PrismaClientValidationError ||
    err.name === "PrismaClientValidationError"
  ) {
    const messageStrings = err.message.split("\n");

    res.status(400).json({
      error: messageStrings[messageStrings.length - 1],
    });
  } else if (
    err instanceof PrismaClientKnownRequestError ||
    err.name === "NotFoundError" ||
    err.name === "PrismaClientKnownRequestError"
  ) {
    console.error("err", err.cause, err.name, err.code, err.meta);
    let message = `Something went wrong with the data supplied. Admin should check the logs`;

    if (err.meta && err.code === "P2002") {
      message = `Value is not unique: ${err.meta?.target}`;
    }

    if (err.code === "P2025") {
      message = `Not found: ${err.message}`;
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
