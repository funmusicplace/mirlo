/**
 * Centralized HTTP client for ActivityPub federation communication
 * Uses `got` library for consistent timeout, retry, and error handling
 */

import { logger } from "../logger";

const ACTIVITYPUB_ACCEPT_HEADER =
  'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/activity+json';

// Lazy load got (ESM module in CommonJS)
let federationClient: any;

async function getFederationClient() {
  if (!federationClient) {
    // Dynamic import to support ESM module in CommonJS context
    const { default: got } = await import("got");
    federationClient = got.extend({
      timeout: { request: 10000 }, // 10 second request timeout
      retry: {
        limit: 3,
        methods: ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS", "TRACE"],
        statusCodes: [408, 429, 500, 502, 503, 504],
        errorCodes: [
          "ETIMEDOUT",
          "ECONNRESET",
          "EADDRINUSE",
          "ECONNREFUSED",
          "EPIPE",
          "ENOTFOUND",
          "ENETUNREACH",
          "EAI_AGAIN",
        ],
      },
      headers: {
        "User-Agent": "Mirlo/1.0 (+https://mirlo.space; federation)",
      },
    });
  }
  return federationClient;
}

/**
 * Fetch a remote ActivityPub document (actor, public key, etc)
 * Includes timeout, retry, and proper error handling
 */
export async function fetchActivityPubDocument(
  url: string
): Promise<Record<string, any>> {
  try {
    logger.debug(`Fetching ActivityPub document from ${url}`);

    const client = await getFederationClient();
    const response = await client.get(url, {
      headers: {
        Accept: ACTIVITYPUB_ACCEPT_HEADER,
      },
      responseType: "json",
    });

    const body = response.body as Record<string, any>;
    logger.debug(`Successfully fetched ${url}`);
    return body;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    logger.warn(`Failed to fetch ${url}: ${errorMsg}`);

    // Check for 404 errors
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      (error as any).response?.statusCode === 404
    ) {
      throw new Error(`ActivityPub document not found (404): ${url}`);
    }

    throw error;
  }
}

/**
 * Send a signed ActivityPub message to a remote inbox
 * Includes timeout and retry logic for delivery reliability
 */
export async function sendSignedActivityPubMessage(
  inboxUrl: string,
  message: Record<string, any>,
  headers: Record<string, string>
): Promise<void> {
  try {
    const domain = new URL(inboxUrl).hostname;

    logger.debug(`Sending ActivityPub message to ${inboxUrl}`);

    const client = await getFederationClient();
    await client.post(inboxUrl, {
      headers: {
        ...headers,
        Host: domain,
        "Content-Type": "application/activity+json",
        Accept: ACTIVITYPUB_ACCEPT_HEADER,
      },
      json: message,
      responseType: "text", // Inbox responses may not be JSON
    });

    logger.debug(`Successfully delivered to ${inboxUrl}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    logger.error(
      `Error sending ActivityPub message to ${inboxUrl}: ${errorMsg}`
    );
    throw error;
  }
}
