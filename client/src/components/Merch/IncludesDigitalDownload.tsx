import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import React from "react";
import { css } from "@emotion/css";

import { getReleaseUrl } from "utils/artist";

const IncludesDigitalDownload: React.FC<{ merch: Merch; artist: Artist }> = ({
  merch,
  artist,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  if (!merch || !artist) {
    return null;
  }

  if (!merch.includePurchaseTrackGroup) {
    return null;
  }

  return (
    <div
      className={css`
        margin-bottom: 1rem;
      `}
    >
      <Trans
        t={t}
        i18nKey="includesDownloadOf"
        values={{ albumTitle: merch.includePurchaseTrackGroup.title }}
        components={{
          link: (
            <Link
              to={getReleaseUrl(merch.artist, merch.includePurchaseTrackGroup)}
            ></Link>
          ),
        }}
      />
    </div>
  );
};

export default IncludesDigitalDownload;
