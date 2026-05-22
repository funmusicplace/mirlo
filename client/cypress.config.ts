import { readFileSync } from "fs";
import { resolve } from "path";

import { Prisma } from "@mirlo/prisma/client";
import { defineConfig } from "cypress";
import { parse } from "dotenv";

import pkg, {
  clearTables,
  createTrack,
  createSubscription,
  createNotification,
} from "../test/utils";

// Inject JWT secrets needed by buildTokens (called from createUser task).
// We parse selectively to avoid setting DATABASE_URL, which Prisma loads
// from prisma/.env pointing to localhost:5434 (the host-accessible port).
const rootEnv = parse(readFileSync(resolve(__dirname, "../.env"), "utf-8"));
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = rootEnv.JWT_SECRET;
if (!process.env.REFRESH_TOKEN_SECRET)
  process.env.REFRESH_TOKEN_SECRET = rootEnv.REFRESH_TOKEN_SECRET;

export default defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    // We run the client on 3000 in CI and 8080 locally
    // Because it gets built in the same way as production
    baseUrl: process.env.CI ? "http://localhost:3000" : "http://localhost:8080",
    setupNodeEvents(on, config) {
      on("task", {
        createClient: async ({ key: clientKey }) => {
          return pkg.createClient(clientKey);
        },
        createUser: async (data: Prisma.UserCreateArgs["data"]) => {
          return pkg.createUser(data);
        },
        createArtist: async (data: { userId: number; name: string }) => {
          return pkg.createArtist(data.userId, data);
        },
        clearTables: async () => {
          await clearTables();
          return true;
        },
        createTrackGroup: async (query: {
          title: string;
          urlSlug: string;
          artistId: number;
          minPrice?: number;
          suggestedPrice?: number;
          published?: boolean;
          publishedAt?: string | null;
          isGettable?: boolean;
          releaseDate?: string;
          isPreorder?: boolean;
          isPublic?: boolean;
        }) => {
          return pkg.createTrackGroup(query.artistId, query);
        },
        createTrack: async (query: {
          title: string;
          urlSlug: string;
          trackGroupId: number;
          isPreview?: boolean;
          allowIndividualSale?: boolean;
        }) => {
          return createTrack(query.trackGroupId, query);
        },
        createUserTrackGroupPurchase: async (query: {
          purchaserUserId: number;
          trackGroupId: number;
          data?: { amount?: number; currency?: string };
        }) => {
          return pkg.createUserTrackGroupPurchase(
            query.purchaserUserId,
            query.trackGroupId,
            query.data
          );
        },
        createUserTrackPurchase: async (query: {
          purchaserUserId: number;
          trackId: number;
          data?: { amount: number };
        }) => {
          return pkg.createUserTrackPurchase(
            query.purchaserUserId,
            query.trackId,
            query.data
          );
        },
        getCurrentUser: async (email: string) => {
          return pkg.getUserByEmail(email);
        },
        createPost: async (query: {
          artistId: number;
          title?: string;
          urlSlug?: string;
          content?: string;
          isPublic?: boolean;
          isDraft?: boolean;
          publishedAt?: string;
          minimumSubscriptionTierId?: number;
        }) => {
          return pkg.createPost(query.artistId, {
            title: query.title,
            urlSlug: query.urlSlug,
            content: query.content,
            isPublic: query.isPublic,
            isDraft: query.isDraft,
            publishedAt: query.publishedAt
              ? new Date(query.publishedAt)
              : undefined,
            minimumSubscriptionTierId: query.minimumSubscriptionTierId,
          });
        },
        createTier: async (query: {
          artistId: number;
          name?: string;
          minAmount?: number;
          isDefaultTier?: boolean;
        }) => {
          return pkg.createTier(query.artistId, {
            name: query.name,
            minAmount: query.minAmount,
            isDefaultTier: query.isDefaultTier,
          });
        },
        createSubscription: async (query: {
          userId: number;
          tierId: number;
          amount?: number;
        }) => {
          return createSubscription(query.userId, query.tierId, query.amount);
        },
        createNotification: async (query: {
          userId: number;
          notificationType: string;
          trackGroupId?: number;
          relatedUserId?: number;
          artistId?: number;
        }) => {
          return createNotification(query);
        },
        createMerch: async (query: {
          artistId: number;
          title?: string;
          minPrice?: number;
          isPublic?: boolean;
          quantityRemaining?: number;
        }) => {
          return pkg.createMerch(query.artistId, query);
        },
        createMerchShippingDestination: async (query: {
          merchId: string;
          homeCountry?: string;
          destinationCountry?: string | null;
          costUnit?: number;
          costExtraUnit?: number;
        }) => {
          return pkg.createMerchShippingDestination(query);
        },
      });
    },
  },
});
