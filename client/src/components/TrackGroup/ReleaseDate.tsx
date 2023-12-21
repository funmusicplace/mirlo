import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import { useTranslation } from "react-i18next";
import { i18n } from "i18next";

export const formatDate = ({
  date,
  options,
  i18n,
}: {
  date: string;
  i18n: i18n;
  options?: Intl.DateTimeFormatOptions;
}): string => {
  const releaseFormat = new Date(date).toLocaleDateString(
    i18n.resolvedLanguage,
    {
      month: "long",
      year: "numeric",
      ...options,
    }
  );

  return releaseFormat;
};

const ReleaseDate: React.FC<{ releaseDate: string }> = ({
  releaseDate: releaseDateString,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const releaseDate = new Date(releaseDateString);
  const beforeReleaseDate = releaseDate > new Date();

  const releaseFormat = formatDate({
    date: releaseDateString,
    options: beforeReleaseDate ? { day: "numeric" } : {},
    i18n,
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
