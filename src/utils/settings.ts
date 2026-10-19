import prisma from "@mirlo/prisma";
import { Settings } from "@mirlo/prisma/client";

import { BucketConfig, DEFAULT_BUCKET_CONFIG } from "./minio";

export interface SettingsType extends Partial<Settings> {
  platformPercent: number;
  cdnUrl?: string;
  bucketNames: BucketConfig;
}

const defaultSettings = {
  platformPercent: 7,
  instanceCustomization: {
    showHeroOnHome: true,
  },
};

export const DEFAULT_INSTANCE_NAME = "Mirlo";

export const resolveInstanceName = (settings: SettingsType): string =>
  settings.settings?.instanceCustomization?.title?.trim() ||
  DEFAULT_INSTANCE_NAME;

export const getInstanceName = async (): Promise<string> =>
  resolveInstanceName(await getSiteSettings());

const trimmedEmail = (value: unknown): string | null =>
  typeof value === "string" ? value.trim() || null : null;

export const resolveFromEmail = (settings: SettingsType): string =>
  trimmedEmail(settings.settings?.emailProvider?.fromEmail) ||
  process.env.SENDGRID_SENDER ||
  "";

export const resolveContactEmail = (settings: SettingsType): string | null =>
  trimmedEmail(settings.settings?.instanceCustomization?.contactEmail);

export const resolveSupportEmail = (settings: SettingsType): string | null =>
  trimmedEmail(settings.settings?.instanceCustomization?.supportEmail) ??
  resolveContactEmail(settings);

export type SetupStage = "welcome" | "guide" | "done";

export const hasInstanceName = (settings: SettingsType): boolean =>
  Boolean(settings.settings?.instanceCustomization?.title?.trim());

export const resolveSetupStage = (settings: SettingsType): SetupStage => {
  if (settings.setupCompletedAt) {
    return "done";
  }
  return hasInstanceName(settings) ? "guide" : "welcome";
};

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
    bucketNames:
      (result.bucketNames as BucketConfig | null) ?? DEFAULT_BUCKET_CONFIG,
  };
};
