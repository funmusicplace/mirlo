import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "./ArtistTrackGroup";
import { bp } from "../../constants";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { useParams } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { ButtonLink } from "components/common/Button";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";

const ArtistAlbums: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (
    !artist ||
    (artist.trackGroups.length === 0 && artist.userId !== user?.id)
  ) {
    return null;
  }

  return (
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
      <SpaceBetweenDiv>
        <div />
        {artist.userId === user?.id && (
          <ButtonLink
            compact
            transparent
            startIcon={<FaPlus />}
            variant="dashed"
            to={`/manage/artists/${artist.id}/new-release`}
          >
            {t("addNewAlbum")}
          </ButtonLink>
        )}
      </SpaceBetweenDiv>
      <TrackgroupGrid
        gridNumber={"3"}
        wrap
        as="ul"
        role="list"
        aria-labelledby="artist-navlink-releases"
      >
        {artist.trackGroups?.map((trackGroup) => (
          <ArtistTrackGroup
            key={trackGroup.id}
            trackGroup={trackGroup}
            as="li"
          />
        ))}
      </TrackgroupGrid>
    </div>
  );
};

export default ArtistAlbums;
