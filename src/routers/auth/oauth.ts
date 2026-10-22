import prisma from "@mirlo/prisma";
import express, { NextFunction, Request, Response } from "express";
import type { Client, InteractionResults } from "oidc-provider";

import {
  approvalStatusOf,
  isMetadataDocumentClientId,
} from "../../auth/oidc/approval";
import { findGrantId } from "../../auth/oidc/grants";
import { getProvider } from "../../auth/oidc/provider";
import { requestedScopes } from "../../auth/oidc/scopes";
import { cookieUserLoggedInWithoutRedirect } from "../../auth/passport";
import { sendMailQueue } from "../../queues/send-mail-queue";
import { AppError } from "../../utils/error";
import { getClient } from "../../utils/getClient";
import { getSiteSettings, resolveContactEmail } from "../../utils/settings";

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
    approval: await approvalStatusOf(clientId),
    scopes: requestedScopes(interaction.params.scope),
  };
};

const requestApproval = async (
  clientId: string,
  metadata: ReturnType<Client["metadata"]>,
  user: Pick<Express.User, "id" | "email">
) => {
  const url = new URL(clientId);
  const data = {
    applicationName: metadata.client_name ?? url.host,
    applicationUrl: metadata.client_uri ?? url.origin,
    redirectUris: [...(metadata.redirect_uris ?? [])],
    status: "pending" as const,
    userId: user.id,
  };
  const created = await prisma.client.createMany({
    data: [{ ...data, allowedCorsOrigins: [], clientIdUrl: clientId }],
    skipDuplicates: true,
  });
  const restored = await prisma.client.updateMany({
    where: { clientIdUrl: clientId, deletedAt: { not: null } },
    data: { ...data, deletedAt: null },
  });

  const contactEmail = resolveContactEmail(await getSiteSettings());
  if (contactEmail && created.count + restored.count > 0) {
    await sendMailQueue.add("send-mail", {
      template: "oauth-approval-requested",
      message: { to: contactEmail },
      locals: {
        applicationName: data.applicationName,
        applicationUrl: data.applicationUrl,
        clientId,
        requestedBy: user.email,
        adminUrl: `${(await getClient()).applicationUrl}/admin/clients`,
      },
    });
  }
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
      const { provider, interaction, client, clientId, approval, scopes } =
        await loadInteraction(req, res);
      const metadata = client.metadata();
      const redirectUri = new URL(String(interaction.params.redirect_uri));
      const redirectHost = ["http:", "https:"].includes(redirectUri.protocol)
        ? redirectUri.host
        : null;
      const domain = isMetadataDocumentClientId(clientId)
        ? new URL(clientId).host
        : metadata.client_uri
          ? new URL(metadata.client_uri).host
          : redirectHost;

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
            name: metadata.client_name ?? domain ?? clientId,
            uri: metadata.client_uri ?? null,
            logoUri: metadata.logo_uri ?? null,
            domain,
          },
          approval,
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
      const { provider, interaction, client, clientId, approval, scopes } =
        await loadInteraction(req, res);

      if (action === "requestApproval") {
        if (!req.user) {
          throw new AppError({ httpCode: 401, description: "Unauthorized" });
        }
        if (isMetadataDocumentClientId(clientId) && approval === "unknown") {
          await requestApproval(clientId, client.metadata(), req.user);
        }
        res.json({
          result: { approval: approval === "unknown" ? "pending" : approval },
        });
        return;
      }

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
        if (approval !== "approved") {
          throw new AppError({
            httpCode: 403,
            description: "This app isn't approved on this instance",
          });
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
