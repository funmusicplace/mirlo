import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import { Toggle } from "components/common/Toggle";
import BackToArtistLink from "components/ManageArtist/BackToArtistLink";
import { queryArtist, queryManagedMerch } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

import { bp } from "../../../../../../constants";
import ManageSectionWrapper from "components/ManageArtist/ManageSectionWrapper";
import UploadArtistImage from "components/ManageArtist/UploadArtistImage";

import DeleteMerchButton from "components/ManageArtist/Merch/DeleteMerchButton";
import MerchDestinations from "components/ManageArtist/Merch/MerchDestinations";
import MerchForm from "components/ManageArtist/Merch/MerchForm";
import MerchFulfillmentLink from "components/ManageArtist/Merch/MerchFulfillmentLink";
import MerchOptions from "components/ManageArtist/Merch/MerchOptions";

const IsPublicToggle: React.FC<{ merch: Merch }> = ({ merch }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const { merchId: merchParamId } = useParams();

  const { refetch } = useQuery(queryManagedMerch(merchParamId ?? ""));
  const { ask } = useConfirm();

  const updatePublic = async (val: boolean) => {
    if (val) {
      const hasUntouchedShipping =
        merch.shippingDestinations.length > 0 &&
        merch.shippingDestinations.every(
          (dest) => dest.costUnit === 0 && dest.costExtraUnit === 0
        );
      if (hasUntouchedShipping && !(await ask(t("zeroShippingConfirmBody")))) {
        return;
      }
    }
    try {
      await api.put(`manage/merch/${merchParamId}`, { isPublic: val });
      refetch();
      snackbar(t("merchUpdated"));
    } catch (e) {
      console.error("e", e);
    }
  };

  return (
    <Box
      variant={merch.isPublic ? "success" : "warning"}
      className={css`
        margin-top: 1rem;
        margin-bottom: 1rem;

        label {
          font-weight: bold;
        }
      `}
    >
      <Toggle
        label={t(merch.isPublic ? "isPublicSet" : "isPublicNotSet")}
        toggled={merch.isPublic}
        onClick={updatePublic}
      />
    </Box>
  );
};

const Index: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const { artistId: artistParamId, merchId: merchParamId } = useParams();

  const { data: artist, isPending: isLoading } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );

  const {
    data: merch,
    isPending: isLoadingMerch,
    refetch,
  } = useQuery(queryManagedMerch(merchParamId ?? ""));

  if (!artist && isLoading) {
    return <LoadingBlocks />;
  } else if (!artist) {
    return null;
  } else if (!merch && isLoadingMerch) {
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
      <BackToArtistLink subPage="merch" />
      <h1>{merch.title || t("untitledMerch")}</h1>
      <IsPublicToggle merch={merch} />
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-top: 2rem;
        `}
      >
        <div
          className={css`
            display: flex;
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
            imageTypeDescription={t("merchImage")}
            existing={merch}
            imageType="image"
            height="400"
            width="400"
            maxDimensions="1500x1500"
            maxSize="15mb"
          />
          <MerchForm merch={merch} artist={artist} reload={refetch} />
        </div>

        <MerchDestinations artist={artist} />
        <MerchOptions />
        <IsPublicToggle merch={merch} />
        <MerchFulfillmentLink />
        <DeleteMerchButton />
      </div>
    </ManageSectionWrapper>
  );
};

export default Index;
