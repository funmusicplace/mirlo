import prisma from "@mirlo/prisma";
import { Settings } from "@mirlo/prisma/client";

interface SettingsType extends Partial<Settings> {
  platformPercent: number;
}

const defaultSettings = {
  platformPercent: 7,
  instanceCustomization: {
    showHeroOnHome: true,
  },
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
      },
    });
  }
  const { settings } = result;
  return {
    ...defaultSettings,
    ...settings,
    ...result,
  };
};
