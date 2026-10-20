import { InstanceLogo } from "@mirlo/prisma/client";

import { generateFullStaticImageUrl } from "../utils/images";
import { instanceLogoPrefix } from "../utils/minio";

export type SerializedInstanceLogo = {
  url: string;
  width: number;
  height: number;
};

export const serializeInstanceLogo = (
  logo: InstanceLogo | null | undefined
): SerializedInstanceLogo | null =>
  logo
    ? {
        url: generateFullStaticImageUrl(
          logo.id,
          instanceLogoPrefix,
          logo.extension
        ),
        width: logo.width,
        height: logo.height,
      }
    : null;
