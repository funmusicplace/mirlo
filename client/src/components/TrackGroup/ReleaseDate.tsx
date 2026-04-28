import { css } from "@emotion/css";
import { i18n } from "i18next";
import React from "react";
import { useTranslation } from "react-i18next";

import { bp } from "../../constants";
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

export const formatRelativeTime = ({
  date,
  i18n,
}: {
  date: string;
  i18n: i18n;
}): string => {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSeconds = Math.round((then - now) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(i18n.resolvedLanguage, {
    numeric: "auto",
  });

  if (Math.abs(diffSeconds) < 60) return rtf.format(diffSeconds, "second");
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, "day");
  if (Math.abs(diffWeeks) < 5) return rtf.format(diffWeeks, "week");
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(diffYears, "year");
};

export const calculateDateWithTimezoneOffset = (dateString: string) => {
  const date = new Date(dateString.split("T")[0]);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset);
};

const ReleaseDate: React.FC<{ releaseDate?: string }> = ({
  releaseDate: releaseDateString,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  if (!releaseDateString) {
    return null;
  }

  const releaseDate = calculateDateWithTimezoneOffset(releaseDateString);
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
        color: var(--mi-secondary-text-color);
        font-size: 1rem;
        width: 100%;
        font-size: var(--mi-font-size-small);
        filter: opacity(80%);

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
