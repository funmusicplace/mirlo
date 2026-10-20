import prisma from "@mirlo/prisma";
import { Client } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/error";

import { findClientRow } from "./oidc/approval";
import { getProvider } from "./oidc/provider";

type BearerResult =
  | { status: "none" }
  | { status: "invalid" }
  | {
      status: "valid";
      user: Express.User;
      oauth: { clientId: string; scopes: string[] };
      client: Client;
    };

const results = new WeakMap<Request, Promise<BearerResult>>();

export const bearerTokenOf = (req: Request) =>
  req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

const resolve = async (req: Request): Promise<BearerResult> => {
  const value = bearerTokenOf(req);
  if (!value) {
    return { status: "none" };
  }
  const provider = await getProvider();
  const token = await provider.AccessToken.find(value);
  if (!token?.accountId || !token.clientId) {
    return { status: "invalid" };
  }
  const client = await findClientRow(token.clientId);
  if (client?.status !== "approved") {
    return { status: "invalid" };
  }
  const user = await prisma.user.findFirst({
    where: { id: Number(token.accountId), disabledAt: null },
  });
  if (!user) {
    return { status: "invalid" };
  }
  return {
    status: "valid",
    user: { ...user, isAdmin: false } as Express.User,
    oauth: { clientId: token.clientId, scopes: [...token.scopes] },
    client,
  };
};

export const resolveBearer = (req: Request) => {
  let result = results.get(req);
  if (!result) {
    result = resolve(req);
    results.set(req, result);
  }
  return result;
};

export const hasScope = (req: Request, scope: string) =>
  !!req.oauth?.scopes.some((s) => s === scope || s === "api");

export const rejectBearer = (
  res: Response,
  next: NextFunction,
  error: "invalid_token" | "insufficient_scope",
  scope?: string
) => {
  res.setHeader(
    "WWW-Authenticate",
    `Bearer error="${error}"${scope ? `, scope="${scope}"` : ""}`
  );
  next(
    error === "invalid_token"
      ? new AppError({
          httpCode: 401,
          description: "Invalid or expired access token",
        })
      : new AppError({
          httpCode: 403,
          description: `This needs the ${scope} scope`,
        })
  );
};
