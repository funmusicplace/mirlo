import { readFile } from "fs/promises";
import { join } from "path";

import prisma from "@mirlo/prisma";

import type { DataMigration } from "..";
import logger from "../../logger";
import { attachInstanceLogos, storeLogoFile } from "../../utils/instanceLogo";

const MIRLO_LOGO_FILENAMES = {
  main: "Logo-With-Wordmark.svg",
  mobile: "Logo_Mirlo_Transparent_RedCircle.svg",
};

const storeMirloLogo = async (filename: string) =>
  storeLogoFile({
    buffer: await readFile(
      join(__dirname, "..", "..", "..", "client", "public", filename)
    ),
    filename,
  });

const defaultInstanceLogo: DataMigration = {
  name: "2026-10-default-instance-logo",
  run: async () => {
    const settings = await prisma.settings.findFirst();
    if (
      !settings?.setupCompletedAt ||
      settings.logoId ||
      settings.mobileLogoId
    ) {
      return true;
    }
    const main = await storeMirloLogo(MIRLO_LOGO_FILENAMES.main);
    const mobile = await storeMirloLogo(MIRLO_LOGO_FILENAMES.mobile).catch(
      async (e) => {
        await main.discard();
        throw e;
      }
    );
    const seeded = await attachInstanceLogos(
      settings.id,
      { main, mobile },
      { onlyIfNoLogo: true, tint: true }
    );
    if (seeded) {
      logger.info("dataMigrations: gave the instance the Mirlo logos, tinted");
    }
    return true;
  },
};

export default defaultInstanceLogo;
