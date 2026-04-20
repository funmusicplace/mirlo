import { IncomingHttpHeaders } from "http";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "mirlo-api-key",
  "x-api-key",
]);

const SENSITIVE_COOKIES = new Set(["jwt", "refresh"]);

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

export const sanitizeBodyForLogs = (body: unknown): unknown => {
  // Handle undefined, null, or non-serializable values
  if (body === undefined || body === null) {
    return body;
  }

  // Deep clone to avoid modifying the original body
  const sanitized = JSON.parse(JSON.stringify(body));

  // Redact ActivityPub signatures
  if (sanitized && typeof sanitized === "object") {
    if (sanitized.signature && typeof sanitized.signature === "object") {
      if (
        sanitized.signature.signatureValue &&
        typeof sanitized.signature.signatureValue === "string"
      ) {
        sanitized.signature.signatureValue = "[REDACTED]";
      }
    }
  }

  return sanitized;
};
