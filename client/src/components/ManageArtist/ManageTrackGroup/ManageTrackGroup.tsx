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
import FeatureFlag from "components/common/FeatureFlag";
import AlbumPaymentReceiver from "./AlbumFormComponents/AlbumPaymentReceiver";
import AllowAllTracksForPromo from "./AlbumFormComponents/AllowAllTracksForPromo";

export interface TrackGroupFormData {
  published: boolean;
  title: string;
  minPrice: string;
  releaseDate: string;
  credits: string;
  about: string;
  coverFile: File[];
}

const ManageTrackGroup: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

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
        <BackToArtistLink />
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

              @media (max-width: ${bp.small}px) {
                width: 100%;
                flex: 100%;
                justify-content: flex-end;
                margin-top: 1rem;
              }
            `}
          >
            {trackGroup && trackGroup.tracks?.length > 0 && (
              <PublishButton trackGroup={trackGroup} reload={refetch} />
            )}
          </div>
        </SpaceBetweenDiv>
      </div>
      <FeatureFlag featureFlag="label">
        <AlbumPaymentReceiver />
      </FeatureFlag>
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
      <AllowAllTracksForPromo reload={refetch} tracks={trackGroup.tracks} />
      {trackGroup && trackGroup?.tracks?.length > 0 && (
        <ManageTrackTable
          tracks={trackGroup.tracks}
          editable
          trackGroupId={trackGroup.id}
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
      {trackGroup && trackGroup.tracks?.length > 0 && (
        <PublishButton trackGroup={trackGroup} reload={refetch} />
      )}
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
