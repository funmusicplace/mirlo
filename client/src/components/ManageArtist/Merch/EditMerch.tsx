import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bp } from "../../../constants";
import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { useQuery } from "@tanstack/react-query";
import {
  queryArtist,
  queryManagedMerch,
  useDeleteMerchMutation,
} from "queries";
import MerchForm from "./MerchForm";
import MerchDestinations from "./MerchDestinations";
import UploadArtistImage from "../UploadArtistImage";
import MerchOptions from "./MerchOptions";
import Box from "components/common/Box";
import FormCheckbox from "components/common/FormCheckbox";
import { Toggle } from "components/common/Toggle";
import api from "services/api";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Button, { ButtonLink } from "components/common/Button";
import { getMerchUrl } from "utils/artist";
import { FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

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
  const snackbar = useSnackbar();
  const navigate = useNavigate();

  const { artistId: artistParamId, merchId: merchParamId } = useParams();

  const { data: artist, isLoading: isLoading } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );

  const {
    data: merch,
    isLoading: isLoadingTrackGroup,
    refetch,
  } = useQuery(queryManagedMerch(merchParamId ?? ""));

  const updatePublic = React.useCallback(
    async (val: boolean) => {
      const packet = { isPublic: val };
      try {
        await api.put(`manage/merch/${merchParamId}`, packet);
        refetch();
      } catch (e) {
        console.error("e", e);
      }
    },
    [merchParamId, refetch]
  );

  const { mutate: deleteMerch } = useDeleteMerchMutation();

  const onDelete = React.useCallback(() => {
    if (!!merch && window.confirm(t("areYouSureDelete") ?? "")) {
      deleteMerch(
        { merchId: merch.id },
        {
          onSuccess() {
            navigate("/manage");
          },
          onError() {
            snackbar(t("problemDeletingMerch"), { type: "warning" });
          },
        }
      );
    }
  }, [artist, t, deleteMerch, navigate, snackbar]);

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
      {merch.isPublic && (
        <SpaceBetweenDiv>
          <div />
          <ButtonLink to={getMerchUrl(artist, merch)}>
            {t("viewMerchLive")}
          </ButtonLink>
        </SpaceBetweenDiv>
      )}
      <Box variant="info">
        <Toggle
          label={t("isPublic")}
          toggled={merch.isPublic}
          onClick={updatePublic}
        />
      </Box>
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
        <Button
          compact
          className={css`
            background-color: var(--mi-alert);
          `}
          buttonRole="warning"
          startIcon={<FaTrash />}
          onClick={onDelete}
        >
          {t("deleteMerch")}
        </Button>{" "}
      </div>
    </ManageSectionWrapper>
  );
};

export default EditMerch;
