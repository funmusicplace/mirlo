import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import WidthContainer from "../common/WidthContainer";
import { FaChevronRight } from "react-icons/fa";
import LinkWithIcon from "components/common/LinkWithIcon";

import { ButtonLink } from "components/common/Button";
import Releases from "components/Releases";

const bgcolor = css`
  width: 100%;
`;

const HomeReleases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });

  return (
    <div className={bgcolor}>
      <Releases limit={8} />
      <WidthContainer
        variant="big"
        className={css`
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-bottom: 4rem !important;
        `}
      >
        <LinkWithIcon to="/artists">{t("viewAllArtists")}</LinkWithIcon>
        <ButtonLink to="/releases" endIcon={<FaChevronRight />}>
          {t("moreReleases")}
        </ButtonLink>
      </WidthContainer>
    </div>
  );
};

export default HomeReleases;
