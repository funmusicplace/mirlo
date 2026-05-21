import prisma from "@mirlo/prisma";
import { Settings } from "@mirlo/prisma/client";

import { BucketConfig } from "./minio";

interface SettingsType extends Partial<Settings> {
  platformPercent: number;
  cdnUrl?: string;
  bucketNames?: BucketConfig | null;
}

const defaultSettings = {
  platformPercent: 7,
  instanceCustomization: {
    showHeroOnHome: true,
  },
};

// Default bucket config for fresh installs: consolidated 3-bucket structure.
// Existing installs with null bucketNames stay in legacy mode (no change to bucket layout).
const DEFAULT_BUCKET_CONFIG: BucketConfig = { prefix: "" };

export const getSiteSettings = async (): Promise<SettingsType> => {
  let [result] = await prisma.settings.findMany();
  if (!result) {
    result = await prisma.settings.create({
      data: {
        settings: {
          platformPercent: 10,
          instanceCustomization: {
            showHeroOnHome: true,
          },
        },
        bucketNames: DEFAULT_BUCKET_CONFIG,
      },
    });
  }
  const { settings } = result;
  return {
    ...defaultSettings,
    ...settings,
    ...result,
    cdnUrl: result.cdnUrl ?? undefined,
    bucketNames: (result.bucketNames as BucketConfig | null) ?? null,
  };
};
