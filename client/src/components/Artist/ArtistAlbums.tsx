import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "./ArtistTrackGroup";
import { bp } from "../../constants";
import { ArtistSection } from "./Artist";
import HeaderDiv from "components/common/HeaderDiv";

const ArtistAlbums: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist || artist.trackGroups.length === 0) {
    return null;
  }

  return (
    <ArtistSection>
      <div
        style={{ marginTop: "0rem" }}
        className={css`
          margin-bottom: 2rem;
          @media screen and (max-width: ${bp.medium}px) {
            border-radius: 0;
            margin-bottom: 0rem;
          }
        `}
      >
        <HeaderDiv>
          <h2
            className={css`
              margin-bottom: 0rem;
            `}
          >
            {t("releases")}
          </h2>
        </HeaderDiv>
        <div
          className={css`
            display: flex;
            flex-wrap: wrap;

            @media screen and (max-width: ${bp.medium}px) {
              padding: 0rem 0rem 0rem 0rem;
            }
          `}
        >
          {artist.trackGroups?.map((trackGroup) => (
            <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
          ))}
        </div>
      </div>
    </ArtistSection>
  );
};

export default ArtistAlbums;
