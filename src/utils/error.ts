import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/client";
import { NextFunction, Request, Response } from "express";

import logger from "../logger";

const getSafeRequestContext = (req: Request) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.toLowerCase().trim()
      : undefined;
  const client =
    typeof req.body?.client === "string" ? req.body.client : undefined;

  return {
    method: req.method,
    path: req.path,
    params: req.params,
    ...(email ? { email } : {}),
    ...(client ? { client } : {}),
  };
};

export enum HttpCode {
  OK = 200,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  NOT_ACCEPTABLE = 406,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  SERVICE_UNAVAILABLE = 503,
}

interface AppErrorArgs {
  name?: string;
  httpCode: HttpCode;
  description: string;
  isOperational?: boolean;
  code?: string;
}

export class AppError extends Error {
  public readonly name: string;
  public readonly description: string;
  public readonly httpCode: HttpCode;
  public readonly isOperational: boolean = true;
  public readonly code?: string;

  constructor(args: AppErrorArgs) {
    super(args.description);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = args.name || "Error";
    this.httpCode = args.httpCode;
    this.description = args.description;
    this.code = args.code;

    if (args.isOperational !== undefined) {
      this.isOperational = args.isOperational;
    }

    Error.captureStackTrace(this);
  }
}

const DATABASE_UNAVAILABLE_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

const isDatabaseUnavailableError = (err: any) =>
  err instanceof PrismaClientInitializationError ||
  err?.name === "PrismaClientInitializationError" ||
  ((err instanceof PrismaClientKnownRequestError ||
    err?.name === "PrismaClientKnownRequestError") &&
    DATABASE_UNAVAILABLE_CODES.has(err.code));

const DATABASE_UNAVAILABLE_MESSAGE =
  "Mirlo is temporarily unavailable, probably for maintenance. Please try again in a few minutes.";

const databaseUnavailablePage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="60" />
    <title>Temporarily unavailable</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5;">
    <h1>We'll be right back</h1>
    <p>${DATABASE_UNAVAILABLE_MESSAGE}</p>
    <p>This page will reload automatically.</p>
  </body>
</html>`;

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const log = req.logger || logger;

  if (err instanceof AppError) {
    const context = getSafeRequestContext(req);
    if (err.httpCode >= 500) {
      console.error(err);
      log.error("Found instance of unhandled AppError", {
        httpCode: err.httpCode,
        name: err.name,
        description: err.description,
        ...context,
      });
    }
    log.info("AppError", {
      httpCode: err.httpCode,
      name: err.name,
      description: err.description,
      ...context,
    });
    return res.status(err.httpCode).json({
      error: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  if (isDatabaseUnavailableError(err)) {
    log.error(`Database unavailable on ${req.method} ${req.path}`, {
      name: err.name,
      code: err.code ?? err.errorCode,
      message: err.message,
    });
    res.setHeader("Retry-After", "60");
    res.status(HttpCode.SERVICE_UNAVAILABLE);
    const wantsHtml =
      !req.path.startsWith("/v1") &&
      !req.path.startsWith("/auth") &&
      req.accepts(["json", "html"]) === "html";
    if (wantsHtml) {
      res.setHeader("Cache-Control", "no-store");
      return res.type("html").send(databaseUnavailablePage);
    }
    return res.json({ error: DATABASE_UNAVAILABLE_MESSAGE });
  }

  // Stripe SDK errors (e.g. terminal reader failures, card declines). Surface
  // Stripe's human-readable message and status code rather than dumping the raw
  // error object (with its headers blob) and returning an empty `{}` body.
  if (
    (typeof err?.type === "string" && err.type.startsWith("Stripe")) ||
    typeof err?.rawType === "string"
  ) {
    const statusCode =
      typeof err.statusCode === "number" ? err.statusCode : 400;
    log.error(
      `Stripe error on ${req.method} ${req.path}: ${err.type ?? err.rawType} (code=${err.code ?? "n/a"}, requestId=${err.requestId ?? "n/a"}): ${err.message}`
    );
    return res.status(statusCode).json({
      error: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  if (
    err instanceof PrismaClientValidationError ||
    err.name === "PrismaClientValidationError"
  ) {
    const messageStrings = err.message.split("\n");
    const message = messageStrings[messageStrings.length - 1];

    log.error(`PrismaClientValidationError: ${message}`);

    return res.status(400).json({ error: message });
  } else if (
    err instanceof PrismaClientKnownRequestError ||
    err.name === "NotFoundError" ||
    err.name === "PrismaClientKnownRequestError"
  ) {
    let message = `Something went wrong with the data supplied. Admin should check the logs`;

    if (err.meta && err.code === "P2002") {
      const uniqueTarget = Array.isArray(err.meta?.target)
        ? err.meta.target.join(",")
        : String(err.meta?.target ?? "unknown");
      const context = getSafeRequestContext(req);

      if (req.path === "/auth/signup" && uniqueTarget.includes("email")) {
        log.warn(
          `Duplicate signup attempt: email already exists (${context.email ?? "unknown email"})`,
          {
            modelName: err.meta?.modelName,
            target: uniqueTarget,
            ...context,
          }
        );
      } else {
        log.warn(`Unique constraint violation`, {
          modelName: err.meta?.modelName,
          target: uniqueTarget,
          ...context,
        });
      }

      message = `Value is not unique: ${err.meta?.target}`;
    } else {
      if (err.code === "P2025") {
        message = `Not found: ${err.message}`;
      }
      log.error(`PrismaClientKnownRequestError: ${message}`, {
        cause: err.cause,
        name: err.name,
        code: err.code,
        meta: err.meta,
        stack: err.stack,
      });
    }
    return res.status(400).json({
      error: message,
    });
  }

  const statusCode = err.status ?? err.statusCode;
  const isClientError = typeof statusCode === "number" && statusCode < 500;
  const errorMessage = `${isClientError ? "Bad request" : "ERROR"}: ${req.method}: ${req.path} params: ${JSON.stringify(req.params)}`;

  if (isClientError) {
    log.warn(errorMessage, { statusCode, message: err.message });
  } else {
    log.error(errorMessage, err, err.stack ?? "");
  }

  if (res.statusCode === 429) {
    return res.json({ error: "Too many requests" });
  } else {
    return res
      .status(err.status ?? 500)
      .json({ error: err.errors ?? err.message ?? "Something went wrong" });
  }
};

export default errorHandler;
