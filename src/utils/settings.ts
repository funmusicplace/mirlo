import prisma from "../../prisma/prisma";

type SettingsType = {
  platformPercent: number;
};

const defaultSettings = {
  platformPercent: 7,
};

export const getSiteSettings = async (): Promise<SettingsType> => {
  const result = await prisma.settings.findFirst();
  const { settings } = result ?? { settings: {} };
  return {
    ...defaultSettings,
    ...settings,
  };
};
