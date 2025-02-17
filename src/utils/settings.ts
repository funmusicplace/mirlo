import prisma from "@mirlo/prisma";
import { Settings } from "@mirlo/prisma/client";

interface SettingsType extends Partial<Settings> {
  platformPercent: number;
}

const defaultSettings = {
  platformPercent: 7,
};

export const getSiteSettings = async (): Promise<SettingsType> => {
  let [result] = await prisma.settings.findMany();
  if (!result) {
    result = await prisma.settings.create({
      data: {
        settings: {
          platformPercent: 7,
        },
      },
    });
  }
  const { settings } = result ?? { settings: {} };
  return {
    ...defaultSettings,
    ...settings,
    ...result,
  };
};
