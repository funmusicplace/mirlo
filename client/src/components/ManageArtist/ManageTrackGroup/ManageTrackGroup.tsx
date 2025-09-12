import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AlbumForm from "../AlbumForm";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";
import PublishButton from "../PublishButton";
import { bp } from "../../../constants";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import BackToArtistLink from "../BackToArtistLink";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedTrackGroup } from "queries";
import AlbumPaymentReceiver from "./AlbumFormComponents/AlbumPaymentReceiver";
import ManageTrackDefaults from "./AlbumFormComponents/ManageTrackDefaults";
import {
  ArtistButton,
  ArtistButtonAnchor,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { getArtistManageUrl, getManageReleaseUrl } from "utils/artist";
import { formatDate } from "components/TrackGroup/ReleaseDate";

export interface TrackGroupFormData {
  published: boolean;
  title: string;
  minPrice: string;
  releaseDate: string;
  credits: string;
  about: string;
  coverFile: File[];
  catalogNumber?: string;
}

const ManageTrackGroup: React.FC<{}> = () => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });

  const { artistId: artistParamId, trackGroupId: trackGroupParamId } =
    useParams();

  const { data: artist, isLoading: isLoading } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );

  const {
    data: trackGroup,
    isLoading: isLoadingTrackGroup,
    refetch,
  } = useQuery(queryManagedTrackGroup(Number(trackGroupParamId)));

  if (!artist && isLoading) {
    return <LoadingBlocks />;
  } else if (!artist) {
    return null;
  } else if (!trackGroup && isLoadingTrackGroup) {
    return <LoadingBlocks />;
  } else if (!trackGroup) {
    return null;
  }

  return (
    <ManageSectionWrapper
      className={css`
        padding-top: 2rem !important;

        @media (max-width: ${bp.small}px) {
          padding-top: 1rem !important;
        }
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        `}
      >
        <BackToArtistLink subPage="releases" />
        <SpaceBetweenDiv>
          <h1
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            <span
              className={css`
                margin-top: 1rem;
              `}
            >
              {t(trackGroup ? "editAlbum" : "createAlbum")}
            </span>
          </h1>
          <div
            className={css`
              display: flex;
              align-items: center;
              gap: 0.75rem;

              @media (max-width: ${bp.small}px) {
                width: 100%;
                flex: 100%;
                justify-content: flex-end;
                margin-top: 1rem;
              }
            `}
          >
            <PublishButton trackGroup={trackGroup} reload={refetch} />
            <ArtistButtonLink
              to={getArtistManageUrl(artist.id) + "/releases/tools"}
              startIcon={<MdOutlineDownloadForOffline />}
            >
              {t("downloadCodes")}
            </ArtistButtonLink>
          </div>
        </SpaceBetweenDiv>
      </div>
      <AlbumPaymentReceiver />
      <AlbumForm
        trackGroup={trackGroup}
        artist={artist}
        reload={() => refetch()}
      />
      <h2
        className={css`
          margin-top: 1.5rem;
        `}
      >
        {t("uploadTracks")}
      </h2>
      <ManageTrackDefaults reload={refetch} trackGroup={trackGroup} />
      {trackGroup && trackGroup?.tracks?.length > 0 && (
        <ManageTrackTable
          tracks={trackGroup.tracks}
          editable
          trackGroupId={trackGroup.id}
          artistId={artist.id}
          owned
          reload={refetch}
        />
      )}
      {trackGroup && (
        <BulkTrackUpload
          trackgroup={trackGroup}
          reload={() => refetch()}
          multiple
        />
      )}
      <hr style={{ marginTop: "1rem", marginBottom: "1rem" }} />

      <PublishButton trackGroup={trackGroup} reload={refetch} />
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
