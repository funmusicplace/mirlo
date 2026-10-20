import prisma from "@mirlo/prisma";
import express, { NextFunction, Request, Response } from "express";
import type { InteractionResults } from "oidc-provider";

import { findGrantId } from "../../auth/oidc/grants";
import { getProvider } from "../../auth/oidc/provider";
import { requestedScopes } from "../../auth/oidc/scopes";
import { cookieUserLoggedInWithoutRedirect } from "../../auth/passport";
import { AppError } from "../../utils/error";

const router = express.Router();

const loadInteraction = async (req: Request, res: Response) => {
  const provider = await getProvider();
  const interaction = await provider
    .interactionDetails(req, res)
    .catch(() => undefined);
  if (!interaction || interaction.uid !== req.params.uid) {
    throw new AppError({
      httpCode: 404,
      description: "This sign-in request has expired",
    });
  }
  const clientId = String(interaction.params.client_id);
  const client = await provider.Client.find(clientId);
  if (!client) {
    throw new AppError({ httpCode: 404, description: "App not found" });
  }
  return {
    provider,
    interaction,
    client,
    clientId,
    scopes: requestedScopes(interaction.params.scope),
  };
};

const grantedScopes = async (
  provider: Awaited<ReturnType<typeof getProvider>>,
  userId: number,
  clientId: string
) => {
  const grantId = await findGrantId(userId, clientId);
  const grant = grantId ? await provider.Grant.find(grantId) : undefined;
  return new Set(grant?.getOIDCScope().split(" ") ?? []);
};

router.get(
  "/:uid/details",
  cookieUserLoggedInWithoutRedirect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider, interaction, client, clientId, scopes } =
        await loadInteraction(req, res);
      const metadata = client.metadata();
      const redirectHost = new URL(String(interaction.params.redirect_uri))
        .host;

      const promptsConsent = String(interaction.params.prompt ?? "")
        .split(" ")
        .includes("consent");
      let needsConsent = true;
      if (req.user && !promptsConsent) {
        const granted = await grantedScopes(provider, req.user.id, clientId);
        needsConsent = scopes.some((scope) => !granted.has(scope));
      }

      res.json({
        result: {
          client: {
            name: metadata.client_name ?? redirectHost,
            uri: metadata.client_uri ?? null,
            logoUri: metadata.logo_uri ?? null,
          },
          redirectHost,
          scopes,
          loggedIn: !!req.user,
          needsConsent,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/:uid/decision",
  cookieUserLoggedInWithoutRedirect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action } = req.body as { action?: string };
      const { provider, interaction, clientId, scopes } = await loadInteraction(
        req,
        res
      );

      let result: InteractionResults;
      if (action === "deny") {
        result = {
          error: "access_denied",
          error_description: "The user denied the request",
        };
      } else if (action === "allow") {
        if (!req.user) {
          throw new AppError({ httpCode: 401, description: "Unauthorized" });
        }
        const user = await prisma.user.findFirst({
          where: { id: req.user.id, disabledAt: null },
          select: { emailConfirmationToken: true },
        });
        if (!user) {
          throw new AppError({ httpCode: 401, description: "Unauthorized" });
        }

        if (user.emailConfirmationToken) {
          result = {
            error: "access_denied",
            error_description: "The account's email address isn't verified",
          };
        } else {
          const accountId = String(req.user.id);
          const grantId = await findGrantId(req.user.id, clientId);
          const grant =
            (grantId && (await provider.Grant.find(grantId))) ||
            new provider.Grant({ accountId, clientId });
          grant.addOIDCScope(scopes);
          const missingClaims = interaction.prompt.details.missingOIDCClaims;
          if (Array.isArray(missingClaims)) {
            grant.addOIDCClaims(missingClaims);
          }
          result = {
            login: { accountId },
            consent: { grantId: await grant.save() },
          };
        }
      } else {
        throw new AppError({ httpCode: 400, description: "Unknown action" });
      }

      const redirectTo = await provider.interactionResult(req, res, result, {
        mergeWithLastSubmission: false,
      });
      res.json({ result: { redirectTo } });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
