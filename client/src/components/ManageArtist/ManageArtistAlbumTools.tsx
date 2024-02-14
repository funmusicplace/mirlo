import React from "react";
import { useArtistContext } from "state/ArtistContext";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import { useTranslation } from "react-i18next";
import AlbumDownloadCodes from "./AlbumDownloadCodes";
import { css } from "@emotion/css";

const ManageArtistAlbumsTools: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });

  const {
    state: { artist },
  } = useArtistContext();

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper
      className={css`
        margin-top: 2rem;
      `}
    >
      <h2>{t("downloadCodes")}</h2>
      <p>{t("downloadCodesExplain")}</p>
      <AlbumDownloadCodes />
    </ManageSectionWrapper>
  );
};

export default ManageArtistAlbumsTools;
