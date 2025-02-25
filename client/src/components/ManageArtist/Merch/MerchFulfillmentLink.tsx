import { css } from "@emotion/css";
import React from "react";

import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";

const MerchFulfillmentLink: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });

  return (
    <>
      <h2
        className={css`
          margin-top: 3rem;
        `}
      >
        {t("merchFulfillment")}
      </h2>
      <p
        className={css`
          padding-bottom: 1rem;
        `}
      >
        {t("merchFulfillmentParagraph")}
      </p>
      <ArtistButtonLink startIcon={<FaArrowRight />} to="/fulfillment">
        {t("viewFulfillment")}
      </ArtistButtonLink>
    </>
  );
};

export default MerchFulfillmentLink;
