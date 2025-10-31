import { defineConfig } from "cypress";
import pkg, { clearTables, createTrack } from "../test/utils";
import { Prisma } from "@mirlo/prisma/client";

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
        }) => {
          return pkg.createTrackGroup(query.artistId, query);
        },
        createTrack: async (query: {
          title: string;
          urlSlug: string;
          trackGroupId: number;
        }) => {
          return createTrack(query.trackGroupId, query);
        },
        createUserTrackGroupPurchase: async (query: {
          purchaserUserId: number;
          trackGroupId: number;
        }) => {
          return pkg.createUserTrackGroupPurchase(
            query.purchaserUserId,
            query.trackGroupId
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
      });
    },
  },
});
