import React from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  queryArtist,
  queryManagedTrackGroup,
  useDeleteTrackGroupMutation,
} from "queries";
import AlbumPaymentReceiver from "./AlbumFormComponents/AlbumPaymentReceiver";
import ManageTrackDefaults from "./AlbumFormComponents/ManageTrackDefaults";
import { ArtistButton, ArtistButtonLink } from "components/Artist/ArtistButtons";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { FaTrash } from "react-icons/fa";
import { getArtistManageUrl } from "utils/artist";
import DownloadableContent from "../Merch/DownloadableContent";
import RecommendedTrackGroups from "./AlbumFormComponents/RecommendedTrackGroups";
import { useSnackbar } from "state/SnackbarContext";

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
  const { t } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });
  const { t: manageArtistT } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const snackbar = useSnackbar();
  const navigate = useNavigate();

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
  const { mutateAsync: deleteTrackGroup, isPending: isDeletingTrackGroup } =
    useDeleteTrackGroupMutation();

  const handleDeleteTrackGroup = React.useCallback(async () => {
    if (!trackGroup || !artist) {
      return;
    }

    const confirmed = window.confirm(
      manageArtistT("deleteTrackGroupConfirm") ?? ""
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteTrackGroup({
        userId: artist.userId,
        trackGroupId: trackGroup.id,
      });
      snackbar(manageArtistT("albumDeleted"), { type: "success" });
      navigate(getArtistManageUrl(artist.id) + "/releases");
    } catch (error) {
      console.error(error);
      snackbar(manageArtistT("somethingWentWrong"), { type: "warning" });
    }
  }, [
    artist,
    deleteTrackGroup,
    manageArtistT,
    navigate,
    snackbar,
    trackGroup,
  ]);

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
                flex-wrap: wrap;
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
            <ArtistButton
              startIcon={<FaTrash />}
              onClick={() => {
                void handleDeleteTrackGroup();
              }}
              isLoading={isDeletingTrackGroup}
            >
              {manageArtistT("delete")}
            </ArtistButton>
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
      <DownloadableContent
        reload={refetch}
        item={trackGroup}
        itemType="release"
      />
      <hr style={{ marginTop: "1rem", marginBottom: "1rem" }} />
      <RecommendedTrackGroups trackGroupId={trackGroup.id} />

      <div
        className={css`
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        `}
      >
        <PublishButton trackGroup={trackGroup} reload={refetch} />
        <ArtistButton
          startIcon={<FaTrash />}
          onClick={() => {
            void handleDeleteTrackGroup();
          }}
          isLoading={isDeletingTrackGroup}
          variant="outlined"
        >
          {manageArtistT("delete")}
        </ArtistButton>
      </div>
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
