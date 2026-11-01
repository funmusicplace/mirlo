import { Response } from "express";

export type SubsonicParams = Record<string, string | undefined>;

const ERROR_MESSAGES = {
  0: "A generic error.",
  10: "Required parameter is missing.",
  40: "Wrong username or password.",
  43: "Multiple conflicting authentication mechanisms provided.",
  44: "Invalid API key.",
  70: "The requested data was not found.",
} as const;

export type SubsonicErrorCode = keyof typeof ERROR_MESSAGES;

export class SubsonicError extends Error {
  constructor(
    readonly code: SubsonicErrorCode,
    readonly httpStatus = 200,
    message: string = ERROR_MESSAGES[code]
  ) {
    super(message);
  }
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// Drops the control characters XML 1.0 forbids, then escapes markup
const escapeXml = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

type Scalar = string | number | boolean | Date;

const isScalar = (value: unknown): value is Scalar =>
  ["string", "number", "boolean"].includes(typeof value) ||
  value instanceof Date;

const scalarText = (value: Scalar) =>
  escapeXml(value instanceof Date ? value.toISOString() : String(value));

// Scalar properties become attributes, objects and arrays become child
// elements named after their key
const toXml = (name: string, value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map((item) => toXml(name, item)).join("");
  }
  if (isScalar(value)) {
    return `<${name}>${scalarText(value)}</${name}>`;
  }
  if (typeof value !== "object" || value === null) {
    return "";
  }
  let attributes = "";
  let children = "";
  for (const [key, child] of Object.entries(value)) {
    if (isScalar(child)) {
      attributes += ` ${key}="${scalarText(child)}"`;
    } else {
      children += toXml(key, child);
    }
  }
  return children
    ? `<${name}${attributes}>${children}</${name}>`
    : `<${name}${attributes}/>`;
};

// Answers in the format the client asked for with the f parameter
export const respond = (
  res: Response,
  params: SubsonicParams,
  result: Record<string, unknown> | SubsonicError
) => {
  const failed = result instanceof SubsonicError;
  const envelope = {
    status: failed ? "failed" : "ok",
    version: "1.16.1",
    type: "mirlo",
    serverVersion: process.env.npm_package_version ?? "0.0.0",
    openSubsonic: true,
    ...(failed
      ? { error: { code: result.code, message: result.message } }
      : result),
  };
  res.status(failed ? result.httpStatus : 200);

  const body = { "subsonic-response": envelope };
  const callback = params.callback?.replace(/[^\w$.]/g, "");
  if (params.f === "json") {
    res.json(body);
  } else if (params.f === "jsonp" && callback) {
    res
      .type("application/javascript")
      .send(`${callback}(${JSON.stringify(body)});`);
  } else {
    const xml = toXml("subsonic-response", {
      xmlns: "http://subsonic.org/restapi",
      ...envelope,
    });
    res
      .type("application/xml; charset=utf-8")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`);
  }
};
