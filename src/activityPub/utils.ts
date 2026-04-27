import { IncomingHttpHeaders } from "http";

const { API_DOMAIN } = process.env;

export const root = new URL(API_DOMAIN || "http://localhost:3000").hostname;

export const rootArtist = `https://${root}/v1/artists/`;

export const headersAreForActivityPub = (
  headers: IncomingHttpHeaders,
  method: "POST" | "GET" | "PUT" | "DELETE"
) => {
  const contentType = headers["content-type"];
  const accept = headers["accept"];

  const isActivityPubMimeType = (header: string | undefined) =>
    header?.includes("application/activity+json") ||
    header?.includes(
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    );

  if (method === "POST" || method === "PUT") {
    return isActivityPubMimeType(contentType) || isActivityPubMimeType(accept);
  }

  return isActivityPubMimeType(accept);
};
