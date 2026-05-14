import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import FeatureFlag from "components/common/FeatureFlag";
import {
  queryArtist,
  queryManagedTrackGroup,
  useDeleteTrackGroupMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageUrl } from "utils/artist";

import { bp } from "../../../constants";
import AlbumForm from "../AlbumForm";
import BackToArtistLink from "../BackToArtistLink";
import ManageSectionWrapper from "../ManageSectionWrapper";
import DownloadableContent from "../Merch/DownloadableContent";

import AlbumPaymentReceiver from "./AlbumFormComponents/AlbumPaymentReceiver";
import ManageTrackDefaults from "./AlbumFormComponents/ManageTrackDefaults";
import RecommendedTrackGroups from "./AlbumFormComponents/RecommendedTrackGroups";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";
import { ZipDropZone } from "./ZipDropZone";

export interface TrackGroupFormData {
  title: string;
  urlSlug?: string;
  minPrice?: string;
  suggestedPrice?: string;
  isGettable?: boolean;
  isPublic?: boolean;
  platformPercent?: string;
  releaseDate?: string;
  publishedAt?: string;
  credits?: string;
  about?: string;
  coverFile?: File[];
  catalogNumber?: string;
  goalAmount?: string;
  isAllOrNothing?: boolean;
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
      <div className="flex flex-col items-start">
        <BackToArtistLink subPage="releases" />
        <h1 className="mt-4">{t(trackGroup ? "editAlbum" : "createAlbum")}</h1>
      </div>
      <AlbumPaymentReceiver />
      <FeatureFlag flag="zipUpload">
        {trackGroup && (
          <FormSection>
            <ZipDropZone
              existingTracksCount={trackGroup?.tracks?.length ?? 0}
              trackGroupId={trackGroup.id}
              artistId={artist.id}
              reload={refetch}
            />
          </FormSection>
        )}
      </FeatureFlag>
      <AlbumForm
        trackGroup={trackGroup}
        artist={artist}
        reload={() => refetch()}
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
      <ArtistButtonLink
        to={getArtistManageUrl(artist.id) + "/releases/tools"}
        startIcon={<MdOutlineDownloadForOffline />}
        variant="outlined"
      >
        {t("downloadCodes")}
      </ArtistButtonLink>
      <hr className="my-8 border-(--mi-tint-x-color)" />
      <ArtistButton
        startIcon={<FaTrash />}
        onClick={() => {
          void handleDeleteTrackGroup();
        }}
        isLoading={isDeletingTrackGroup}
        className="!bg-(--mi-red-700) !border-(--mi-red-700) !text-(--mi-red-100) [&_svg]:!fill-(--mi-red-100) enabled:hover:!bg-(--mi-red-800) enabled:hover:!border-(--mi-red-800)"
      >
        {manageArtistT("delete")}
      </ArtistButton>
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
