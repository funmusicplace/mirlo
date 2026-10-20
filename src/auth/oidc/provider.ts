import prisma from "@mirlo/prisma";
import type { NextFunction, Request, Response } from "express";
import Provider, { interactionPolicy } from "oidc-provider";

import logger from "../../logger";

import { adapterFor } from "./adapter";
import { loadKeys } from "./keys";

const DAY = 24 * 60 * 60;

export const OIDC_MOUNT_PATH = "/oidc";

export const issuer = () => process.env.API_DOMAIN ?? "http://localhost:3000";

export const interactionUrl = (uid: string) =>
  `${process.env.CLIENT_DOMAIN ?? issuer()}/oauth/${uid}`;

// Always hand the request to our interaction so the Mirlo session cookie,
// not the provider's own session, decides who is signing in.
const policy = () => {
  const base = interactionPolicy.base();
  base
    .get("login")
    ?.checks.add(
      new interactionPolicy.Check(
        "mirlo_session",
        "the Mirlo session is checked on every authorization",
        "login_required",
        (ctx) => !ctx.oidc.result?.login
      )
    );
  return base;
};

const findAccount = async (_ctx: unknown, sub: string) => {
  const id = Number(sub);
  if (!Number.isInteger(id)) {
    return undefined;
  }
  const user = await prisma.user.findFirst({
    where: { id },
    select: {
      name: true,
      email: true,
      disabledAt: true,
      emailConfirmationToken: true,
    },
  });
  if (!user || user.disabledAt) {
    return undefined;
  }
  return {
    accountId: sub,
    claims: () => ({
      sub,
      name: user.name ?? undefined,
      email: user.email,
      email_verified: !user.emailConfirmationToken,
    }),
  };
};

const buildProvider = async () => {
  const { jwks, cookieKeys } = await loadKeys();

  const provider = new Provider(issuer(), {
    adapter: adapterFor,
    findAccount,
    jwks,
    cookies: { keys: cookieKeys },
    claims: {
      openid: ["sub"],
      profile: ["name"],
      email: ["email", "email_verified"],
    },
    scopes: ["openid", "offline_access", "profile", "email"],
    responseTypes: ["code"],
    pkce: { required: () => true },
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      rpInitiatedLogout: { enabled: false },
    },
    interactions: {
      url: (_ctx, interaction) => interactionUrl(interaction.uid),
      policy: policy(),
    },
    ttl: {
      AccessToken: 60 * 60,
      AuthorizationCode: 60,
      IdToken: 60 * 60,
      Interaction: 60 * 60,
      Session: 14 * DAY,
      Grant: 365 * DAY,
      RefreshToken: 30 * DAY,
    },
  });
  provider.proxy = true;
  provider.on("server_error", (_ctx, error) => {
    logger.error(`oidc-provider server error: ${error}`);
  });
  return provider;
};

let providerPromise: Promise<Provider> | undefined;

export const getProvider = () => {
  providerPromise ??= buildProvider().catch((e) => {
    providerPromise = undefined;
    throw e;
  });
  return providerPromise;
};

let callback: ReturnType<Provider["callback"]> | undefined;

export const oidcHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    callback ??= (await getProvider()).callback();
    callback(req, res);
  } catch (e) {
    next(e);
  }
};

export const discoveryAlias = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.url = "/.well-known/openid-configuration";
  req.originalUrl = `${OIDC_MOUNT_PATH}${req.url}`;
  return oidcHandler(req, res, next);
};
