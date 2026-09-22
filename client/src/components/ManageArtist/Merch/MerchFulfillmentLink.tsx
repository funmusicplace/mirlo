import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";

const MerchFulfillmentLink: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const { t: tPageTitles } = useTranslation("translation", {
    keyPrefix: "pageTitles",
  });

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
        {t("merchFulfillmentParagraph", {
          pageName: tPageTitles("fulfillment"),
        })}
      </p>
      <ArtistButtonLink startIcon={<FaArrowRight />} to="/fulfillment">
        {t("viewFulfillment")}
      </ArtistButtonLink>
    </>
  );
};

export default MerchFulfillmentLink;
