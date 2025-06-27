import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import React from "react";
import { css } from "@emotion/css";

import { getReleaseUrl } from "utils/artist";

export const openOutsideLinkAfter = css`
  ::after {
    content: "⤴";
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    margin-left: 0.1rem;
    margin-right: 0.3rem;
    background-size: contain;
  }
`;

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
          albumLink: (
            <Link
              className={
                css`
                  font-weight: bold;
                ` +
                " " +
                openOutsideLinkAfter
              }
              to={getReleaseUrl(merch.artist, merch.includePurchaseTrackGroup)}
              target="_blank"
            ></Link>
          ),
        }}
      />
    </div>
  );
};

export default IncludesDigitalDownload;
