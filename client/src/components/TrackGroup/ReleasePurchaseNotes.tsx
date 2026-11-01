import styled from "@emotion/styled";
import React from "react";
import { useTranslation } from "react-i18next";

import { bp } from "../../constants";

import ReleaseDownloadableContent from "./ReleaseDownloadableContent";

const Notes = styled.div<{ flush?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  color: var(--mi-light-foreground-color);

  p {
    margin: 0;
  }

  @media screen and (max-width: ${bp.small}px) {
    ${(props) =>
      props.flush ? "" : "order: 1; padding: var(--mi-side-paddings-xsmall);"}
  }

  &:empty {
    display: none;
  }
`;

const ReleasePurchaseNotes: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
  centered?: boolean;
  flush?: boolean;
}> = ({ trackGroup, artist, centered, flush }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <Notes
      flush={flush}
      className={`text-xs ${centered ? "items-center text-center" : ""}`}
    >
      {trackGroup.isGettable && trackGroup.tracks.length > 0 && (
        <p>{t("downloadCodecsInfo")}</p>
      )}
      <ReleaseDownloadableContent trackGroup={trackGroup} artist={artist} />
    </Notes>
  );
};

export default ReleasePurchaseNotes;
