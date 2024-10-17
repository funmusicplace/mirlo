import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import { useTranslation } from "react-i18next";
import { i18n } from "i18next";

export const formatDate = ({
  date,
  options: defaultOptions,
  i18n,
}: {
  date: string;
  i18n: i18n;
  options?: Intl.DateTimeFormatOptions;
}): string => {
  const options: Intl.DateTimeFormatOptions = defaultOptions ?? {
    dateStyle: "short",
    timeStyle: "short",
  };

  const releaseFormat = new Date(date).toLocaleString(
    i18n.resolvedLanguage,
    options
  );

  return releaseFormat;
};

const ReleaseDate: React.FC<{ releaseDate: string }> = ({
  releaseDate: releaseDateString,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const date = new Date(releaseDateString.split("T")[0]);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const releaseDate = new Date(date.getTime() + userTimezoneOffset);
  const beforeReleaseDate = releaseDate > new Date();

  const releaseFormat = formatDate({
    date: releaseDate.toString(),
    options: beforeReleaseDate
      ? { day: "numeric", month: "long" }
      : { day: "numeric", month: "long", year: "numeric" },
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
