import { css } from "@emotion/css";
import React from "react";
import { useParams } from "react-router-dom";
import TrackGroupCard from "./TrackGroupCard";
import { useTranslation } from "react-i18next";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { FaWrench } from "react-icons/fa";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "./ManageSectionWrapper";
import { NewAlbumButton } from "./NewAlbumButton";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedArtistTrackGroups } from "queries";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";

const ManageArtistAlbums: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId } = useParams();
  const { data: artist, isLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: trackGroups, isLoading: isLoadingTrackGroups } = useQuery(
    queryManagedArtistTrackGroups({ artistId: Number(artistId) })
  );

  return (
    <ManageSectionWrapper>
      <SpaceBetweenDiv>
        {trackGroups?.results.length === 0 && !isLoadingTrackGroups && (
          <div>{t("noAlbumsYet")}</div>
        )}
        {trackGroups?.results.length !== 0 && <div />}
        <div
          className={css`
            display: flex;
          `}
        >
          <ArtistButtonLink
            to={`/manage/artists/${artistId}/releases/tools`}
            size="compact"
            startIcon={<FaWrench />}
            variant="outlined"
            collapsible
            className={css`
              margin-right: 0.25rem;
            `}
          >
            {t("downloadCodes")}
          </ArtistButtonLink>
          {artist ? <NewAlbumButton artist={artist} /> : undefined}
        </div>
      </SpaceBetweenDiv>
      {isLoading && <LoadingBlocks />}
      {(trackGroups?.results.length ?? 0) > 0 && (
        <div
          className={css`
            padding-bottom: 1rem;
            display: flex;
            flex-wrap: wrap;
          `}
        >
          {artist &&
            trackGroups?.results.map((album) => (
              <TrackGroupCard artist={artist} album={album} key={album.id} />
            ))}
        </div>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageArtistAlbums;
