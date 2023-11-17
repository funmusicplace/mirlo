import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "./ArtistTrackGroup";
import { bp } from "../../constants";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { FaPen } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import { ArtistSection } from "./Artist";

const ArtistAlbums: React.FC<{ artist: Artist }> = ({ artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();

  const ownedByUser = artist.userId === user?.id;

  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  console.log("artist", artist.trackGroups);
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
          background: var(--mi-light-background-color);
        }
      `}
    >
      <div
        className={css`
          padding-top: 0.5rem;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          align-items: center;

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem;
          }
        `}
      >
        <h2>{t("releases")}</h2>
        {ownedByUser && (
          <Link to={`/manage/artists/${artist.id}`}>
            <Button compact transparent startIcon={<FaPen />}>
              {t("edit")}
            </Button>
          </Link>
        )}
      </div>
      <div
        className={css`
          display: flex;
          flex-wrap: wrap;

          @media screen and (max-width: ${bp.medium}px) {
            
          }
        `}
      >
        {artist.trackGroups?.map((trackGroup) => (
          <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
        ))}
      </div></div>
    </ArtistSection>
  );
};

export default ArtistAlbums;
