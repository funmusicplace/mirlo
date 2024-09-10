import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bp } from "../../../constants";
import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedMerch } from "queries";
import MerchForm from "./MerchForm";
import MerchDestinations from "./MerchDestinations";
import UploadArtistImage from "../UploadArtistImage";
import MerchOptions from "./MerchOptions";

export interface TrackGroupFormData {
  published: boolean;
  title: string;
  type: TrackGroup["type"];
  minPrice: string;
  releaseDate: string;
  credits: string;
  about: string;
  coverFile: File[];
}

const EditMerch: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });

  const { artistId: artistParamId, merchId: merchParamId } = useParams();

  const { data: artist, isLoading: isLoading } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );

  const {
    data: merch,
    isLoading: isLoadingTrackGroup,
    refetch,
  } = useQuery(queryManagedMerch(merchParamId ?? ""));

  if (!artist && isLoading) {
    return <LoadingBlocks />;
  } else if (!artist) {
    return null;
  } else if (!merch && isLoadingTrackGroup) {
    return <LoadingBlocks />;
  } else if (!merch) {
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
        <div
          className={css`
            display: flex;
            align-items: center;
            width: 100%;

            @media (max-width: ${bp.small}px) {
              width: 100%;
              flex: 100%;
              justify-content: flex-end;
              margin-top: 1rem;
              flex-direction: column;
            }

            @media (min-width: ${bp.small}px) {
              form {
                margin-left: 1rem;
              }
            }
          `}
        >
          <UploadArtistImage
            imageTypeDescription="merch image"
            existing={merch}
            imageType="image"
            height="400"
            width="400"
            maxDimensions="1500x1500"
            maxSize="15mb"
          />
          <MerchForm merch={merch} artist={artist} reload={refetch} />
        </div>
        <MerchDestinations />
        <MerchOptions />
      </div>
    </ManageSectionWrapper>
  );
};

export default EditMerch;
