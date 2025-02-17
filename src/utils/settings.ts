import prisma from "@mirlo/prisma";
import { Settings } from "@mirlo/prisma/client";

interface SettingsType extends Partial<Settings> {
  platformPercent: number;
}

const defaultSettings = {
  platformPercent: 7,
};

export const getSiteSettings = async (): Promise<SettingsType> => {
  const result = await prisma.settings.findMany();
  const { settings } = result[0] ?? { settings: {} };
  return {
    ...defaultSettings,
    ...settings,
  };
};
