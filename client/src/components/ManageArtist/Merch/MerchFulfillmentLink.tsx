import Button, { ButtonLink } from "components/common/Button";

import { useParams } from "react-router-dom";
import { css } from "@emotion/css";
import React from "react";

import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";

const MerchFulfillmentLink: React.FC<{}> = () => {
  const { merchId: merchParamId } = useParams();
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
      <ButtonLink startIcon={<FaArrowRight />} to="/fulfillment">
        {t("viewFulfillment")}
      </ButtonLink>
    </>
  );
};

export default MerchFulfillmentLink;
