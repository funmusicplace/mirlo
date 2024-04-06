import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "./ArtistTrackGroup";
import { bp } from "../../constants";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { Link, useParams } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "components/common/Button";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";

const ArtistAlbums: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" }),
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
          <Link to={`/manage/artists/${artist.id}/new-release`}>
            <Button compact transparent startIcon={<FaPlus />} variant="dashed">
              {t("addNewAlbum")}
            </Button>
          </Link>
        )}
      </SpaceBetweenDiv>
      <TrackgroupGrid gridNumber={"3"} wrap>
        {artist.trackGroups?.map((trackGroup) => (
          <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
        ))}
      </TrackgroupGrid>
    </div>
  );
};

export default ArtistAlbums;
