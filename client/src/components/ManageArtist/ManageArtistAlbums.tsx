import { css } from "@emotion/css";
import { ButtonLink } from "components/common/Button";
import React from "react";
import { useParams } from "react-router-dom";
import TrackGroupCard from "./TrackGroupCard";
import { useTranslation } from "react-i18next";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { FaWrench } from "react-icons/fa";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "./ManageSectionWrapper";
import { useAuthContext } from "state/AuthContext";
import { NewAlbumButton } from "./NewAlbumButton";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryUserTrackGroups } from "queries";

const ManageArtistAlbums: React.FC<{}> = () => {
  const { user } = useAuthContext();

  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const userId = user?.id;

  const { artistId } = useParams();
  const { data: artist, isLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: trackGroups, isLoading: isLoadingTrackGroups } = useQuery(
    queryUserTrackGroups({ userId: Number(userId), artistId: Number(artistId) })
  );

  return (
    <ManageSectionWrapper>
      <SpaceBetweenDiv>
        {trackGroups?.results.length === 0 && !isLoadingTrackGroups && (
          <div>{t("noAlbumsYet")}</div>
        )}
        {trackGroups?.results.length !== 0 && <div />}
        <div>
          <ButtonLink
            to={`/manage/artists/${artistId}/releases/tools`}
            compact
            transparent
            startIcon={<FaWrench />}
            variant="outlined"
            collapsible
            className={css`
              margin-right: 0.25rem;
            `}
          >
            {t("tools")}
          </ButtonLink>
          {artist ? <NewAlbumButton artist={artist} /> : undefined}
        </div>
      </SpaceBetweenDiv>
      {isLoading && <LoadingBlocks />}
      {trackGroups?.results.length && trackGroups?.results.length > 0 && (
        <div
          className={css`
            padding-bottom: 1rem;
          `}
        >
          {artist &&
            trackGroups.results.map((album) => (
              <TrackGroupCard artist={artist} album={album} key={album.id} />
            ))}
        </div>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageArtistAlbums;
