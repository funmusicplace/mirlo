import prisma from "@mirlo/prisma";
import type { Client } from "@mirlo/prisma/client";
import type { ClientMetadata } from "oidc-provider";

import { AppError } from "../../utils/error";

const isWebUri = (uri: string) => /^https?:\/\//i.test(uri);

const validUrlOrUndefined = (url: string) =>
  URL.canParse(url) && isWebUri(url) ? url : undefined;

type OAuthClientRow = Pick<
  Client,
  | "id"
  | "applicationName"
  | "applicationUrl"
  | "redirectUris"
  | "confidential"
  | "key"
>;

export const metadataForClientRow = (
  client: OAuthClientRow
): ClientMetadata | undefined => {
  if (client.redirectUris.length === 0) {
    return undefined;
  }

  const base: ClientMetadata = {
    client_id: String(client.id),
    client_name: client.applicationName,
    client_uri: validUrlOrUndefined(client.applicationUrl),
    redirect_uris: client.redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  };

  if (client.confidential) {
    if (!client.key) {
      return undefined;
    }
    return {
      ...base,
      client_secret: client.key,
      token_endpoint_auth_method: "client_secret_basic",
    };
  }

  return {
    ...base,
    token_endpoint_auth_method: "none",
    application_type: client.redirectUris.every(isWebUri) ? "web" : "native",
  };
};

export const clientMetadataFor = async (
  id: string
): Promise<ClientMetadata | undefined> => {
  if (!/^\d+$/.test(id)) {
    return undefined;
  }
  const client = await prisma.client.findFirst({
    where: {
      id: Number(id),
      deletedAt: null,
      status: "approved",
      clientIdUrl: null,
    },
  });
  return client ? metadataForClientRow(client) : undefined;
};

export const parseRedirectUris = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (
    !Array.isArray(value) ||
    value.some(
      (uri) =>
        typeof uri !== "string" || !URL.canParse(uri) || uri.includes("#")
    )
  ) {
    throw new AppError({
      httpCode: 400,
      description: "redirectUris must be a list of URLs without fragments",
    });
  }
  return value;
};
