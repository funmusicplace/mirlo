import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import { useTranslation } from "react-i18next";

const ReleaseDate: React.FC<{ releaseDate: string }> = ({
  releaseDate: releaseDateString,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const releaseDate = new Date(releaseDateString);
  const beforeReleaseDate = releaseDate > new Date();

  const releaseFormat = new Date(releaseDate).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    ...(beforeReleaseDate ? { day: "numeric" } : {}),
  });

  return (
    <div
      className={css`
        color: var(--mi-light-foreground-color);
        font-size: 1rem;

        @media screen and (max-width: ${bp.medium}px) {
          font-size: var(--mi-font-size-small);
        }
      `}
    >
      {t(beforeReleaseDate ? "futureRelease" : "pastRelease", {
        date: releaseFormat,
      })}
    </div>
  );
};

export default ReleaseDate;
