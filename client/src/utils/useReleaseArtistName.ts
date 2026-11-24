import { toLanguageTag } from "i18n";
import React from "react";
import { useTranslation } from "react-i18next";

import { formatTrackArtistLine, getReleaseArtistName } from "./artist";

export const useReleaseArtistName = () => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "trackArtists",
  });
  const locale = toLanguageTag(i18n.resolvedLanguage);
  return React.useMemo(
    () => ({
      releaseArtistName: (
        trackGroup: Parameters<typeof getReleaseArtistName>[0]
      ) => getReleaseArtistName(trackGroup, locale),
      trackArtistLine: (track: Parameters<typeof formatTrackArtistLine>[0]) =>
        formatTrackArtistLine(
          track,
          (main, featured) => t("lineWithGuests", { main, featured }),
          locale
        ),
    }),
    [t, locale]
  );
};
