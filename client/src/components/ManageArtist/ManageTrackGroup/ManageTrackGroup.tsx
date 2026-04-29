import { css } from "@emotion/css";
import styled from "@emotion/styled";
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
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageUrl } from "utils/artist";

import { bp } from "../../../constants";
import AlbumForm from "../AlbumForm";
import ManageSectionWrapper from "../ManageSectionWrapper";
import DownloadableContent from "../Merch/DownloadableContent";
import PublishButton from "../PublishButton";

import RecommendedTrackGroups from "./AlbumFormComponents/RecommendedTrackGroups";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";

export interface TrackGroupFormData {
  title: string;
  minPrice: string;
  suggestedPrice?: string;
  isGettable?: boolean;
  platformPercent?: string;
  releaseDate?: string;
  credits: string;
  about: string;
  coverFile: File[];
  catalogNumber?: string;
}

export const FormSection = styled.div`
  margin: 2rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--mi-tint-x-color);
`;

const ManageTrackGroup: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });
  const { t: manageArtistT } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const isFlowV2 = location.pathname.includes("release-flow-2");
  const { artistId: artistParamId, trackGroupId: trackGroupParamId } =
    useParams();

  const { data: artist, isPending: isLoading } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );

  const {
    data: trackGroup,
    isPending: isLoadingTrackGroup,
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
        trackGroupId: trackGroup.id,
      });
      snackbar(manageArtistT("albumDeleted"), { type: "success" });
      navigate(getArtistManageUrl(artist.id) + "/releases");
    } catch (error) {
      console.error(error);
      snackbar(manageArtistT("somethingWentWrong"), { type: "warning" });
    }
  }, [artist, deleteTrackGroup, manageArtistT, navigate, snackbar, trackGroup]);

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
            {!isFlowV2 && (
              <PublishButton
                trackGroup={trackGroup}
                reload={refetch}
                isFlowV2={isFlowV2}
              />
            )}
            {!isFlowV2 && (
              <ArtistButtonLink
                to={getArtistManageUrl(artist.id) + "/releases/tools"}
                startIcon={<MdOutlineDownloadForOffline />}
              >
                {t("downloadCodes")}
              </ArtistButtonLink>
            )}
            {!isFlowV2 && (
              <ArtistButton
                startIcon={<FaTrash />}
                onClick={() => {
                  void handleDeleteTrackGroup();
                }}
                isLoading={isDeletingTrackGroup}
              >
                {manageArtistT("delete")}
              </ArtistButton>
            )}
          </div>
        </SpaceBetweenDiv>
      </div>
      <AlbumPaymentReceiver />
      <AlbumForm
        trackGroup={trackGroup}
        artist={artist}
        reload={() => refetch()}
        isFlowV2={isFlowV2}
      />
      <FormSection>
        <h2>{t("uploadTracks")}</h2>
        <ManageTrackDefaults trackGroup={trackGroup} reload={refetch} />
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
      </FormSection>
      <FormSection>
        <h2>{t("downloadableContent")}</h2>
        <DownloadableContent
          reload={refetch}
          item={trackGroup}
          itemType="release"
        />
      </FormSection>
      <FormSection>
        <RecommendedTrackGroups trackGroupId={trackGroup.id} />
      </FormSection>

      <div
        className={css`
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        `}
      >
        {isFlowV2 ? (
          <ArtistButtonLink
            to={getArtistManageUrl(artist.id) + "/releases/tools"}
            startIcon={<MdOutlineDownloadForOffline />}
            variant="outlined"
          >
            {t("downloadCodes")}
          </ArtistButtonLink>
        ) : (
          <PublishButton
            trackGroup={trackGroup}
            reload={refetch}
            isFlowV2={isFlowV2}
          />
        )}
        {!isFlowV2 && (
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
        )}
      </div>
      {isFlowV2 && (
        <>
          <FormSection />
          <ArtistButton
            startIcon={<FaTrash />}
            onClick={() => {
              void handleDeleteTrackGroup();
            }}
            isLoading={isDeletingTrackGroup}
            className={css`
              background-color: var(--mi-red-700) !important;
              border-color: var(--mi-red-700) !important;
              color: var(--mi-red-100) !important;

              svg {
                fill: var(--mi-red-100) !important;
              }

              &:hover:not(:disabled) {
                background-color: var(--mi-red-800) !important;
                border-color: var(--mi-red-800) !important;
              }
            `}
          >
            {manageArtistT("delete")}
          </ArtistButton>
        </>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
