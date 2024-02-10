import { css } from "@emotion/css";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import ManageSubscriptionTierBox from "./ManageSubscriptionTierBox";
import SubscriptionForm from "./SubscriptionForm";
import { useArtistContext } from "state/ArtistContext";
import useGetUserObjectById from "utils/useGetUserObjectById";
import { Link, useParams } from "react-router-dom";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { FaPlus } from "react-icons/fa";
import AlbumDownloadCodes from "./AlbumDownloadCodes";

const ManageArtistAlbumsTools: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [isOpenDownloadCodes, setIsOpenDownloadCodes] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });

  const {
    state: { artist },
  } = useArtistContext();
  const { artistId } = useParams();
  const { objects: tiers, reload } =
    useGetUserObjectById<ArtistSubscriptionTier>(
      "artists",
      user?.id,
      artistId,
      `/subscriptionTiers`,
      { multiple: true }
    );

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <h2>{t("downloadCodes")}</h2>
      <p>{t("downloadCodesExplanation")}</p>
      <AlbumDownloadCodes />
    </ManageSectionWrapper>
  );
};

export default ManageArtistAlbumsTools;
