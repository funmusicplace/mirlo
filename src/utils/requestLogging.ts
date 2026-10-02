import { randomUUID } from "crypto";
import { IncomingHttpHeaders } from "http";

import { NextFunction, Request, Response } from "express";

import logger from "../logger";

const REQUEST_ID_HEADER = "X-Request-Id";

// Assigns a per-request id
export const attachRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  req.logger = logger.child({ requestId });
  next();
};

const HEAVY_REQUEST_DURATION_MS = 2000;
const HEAVY_REQUEST_MEMORY_BYTES = 50 * 1024 * 1024;

const toMb = (bytes: number) => Math.round(bytes / 1024 / 1024);

export const logHeavyRequests = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = process.hrtime.bigint();
  const before = process.memoryUsage();
  let logged = false;

  const onDone = () => {
    if (logged) {
      return;
    }
    logged = true;
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const after = process.memoryUsage();
    const heapDelta = after.heapUsed - before.heapUsed;
    const rssDelta = after.rss - before.rss;

    if (
      durationMs < HEAVY_REQUEST_DURATION_MS &&
      heapDelta < HEAVY_REQUEST_MEMORY_BYTES &&
      rssDelta < HEAVY_REQUEST_MEMORY_BYTES
    ) {
      return;
    }

    (req.logger ?? logger).warn(
      `heavy-request: ${req.method} ${req.originalUrl.split("?")[0]} status=${res.statusCode} finished=${res.writableFinished} durationMs=${Math.round(durationMs)} heapDelta=${toMb(heapDelta)}MB rssDelta=${toMb(rssDelta)}MB heapUsed=${toMb(after.heapUsed)}MB rss=${toMb(after.rss)}MB contentLength=${res.getHeader("content-length") ?? "-"}`
    );
  };

  res.on("finish", onDone);
  res.on("close", onDone);
  next();
};

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "mirlo-api-key",
  "x-api-key",
]);

const SENSITIVE_COOKIES = new Set(["jwt", "refresh"]);

const SENSITIVE_BODY_FIELDS = new Set([
  "password",
  "newPassword",
  "oldPassword",
  "confirmPassword",
]);

const redactCookieHeader = (cookieHeader: string): string => {
  return cookieHeader
    .split(";")
    .map((cookiePart) => {
      const trimmed = cookiePart.trim();
      if (!trimmed) {
        return trimmed;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return trimmed;
      }

      const name = trimmed.slice(0, separatorIndex).trim().toLowerCase();
      if (SENSITIVE_COOKIES.has(name)) {
        return `${trimmed.slice(0, separatorIndex)}=[REDACTED]`;
      }

      return trimmed;
    })
    .join("; ");
};

export const sanitizeHeadersForLogs = (
  headers: IncomingHttpHeaders
): Record<string, string | string[] | undefined> => {
  const sanitized: Record<string, string | string[] | undefined> = {
    ...headers,
  };

  for (const [key, value] of Object.entries(sanitized)) {
    const normalizedKey = key.toLowerCase();

    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (normalizedKey === "cookie") {
      if (typeof value === "string") {
        sanitized[key] = redactCookieHeader(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((cookieValue) =>
          redactCookieHeader(cookieValue)
        );
      }
    }
  }

  return sanitized;
};

const redactSensitiveFields = (obj: Record<string, unknown>): void => {
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_BODY_FIELDS.has(key)) {
      obj[key] = "[REDACTED]";
    } else if (
      obj[key] &&
      typeof obj[key] === "object" &&
      !Array.isArray(obj[key])
    ) {
      redactSensitiveFields(obj[key] as Record<string, unknown>);
    }
  }
};

export const sanitizeBodyForLogs = (body: unknown): unknown => {
  // Handle undefined, null, or non-serializable values
  if (body === undefined || body === null) {
    return body;
  }

  // Deep clone to avoid modifying the original body
  const sanitized = JSON.parse(JSON.stringify(body));

  if (sanitized && typeof sanitized === "object") {
    // Redact ActivityPub signatures
    if (sanitized.signature && typeof sanitized.signature === "object") {
      if (
        sanitized.signature.signatureValue &&
        typeof sanitized.signature.signatureValue === "string"
      ) {
        sanitized.signature.signatureValue = "[REDACTED]";
      }
    }

    redactSensitiveFields(sanitized);
  }

  return sanitized;
};
