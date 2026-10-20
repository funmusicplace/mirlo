import prisma from "@mirlo/prisma";
import type { ClientMetadata } from "oidc-provider";

const isWebUri = (uri: string) => /^https?:\/\//i.test(uri);

const validUrlOrUndefined = (url: string) =>
  URL.canParse(url) && isWebUri(url) ? url : undefined;

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
  if (!client || client.redirectUris.length === 0) {
    return undefined;
  }

  const base: ClientMetadata = {
    client_id: id,
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
