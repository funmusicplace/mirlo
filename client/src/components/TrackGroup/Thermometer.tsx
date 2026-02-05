import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { queryTrackGroupSupporters } from "queries";

import { useTranslation } from "react-i18next";

function Thermometer({
  goal,
  artist,
  trackGroupId,
  hideIfUnder10Percent,
}: {
  goal: number;
  trackGroupId: number;
  artist: Artist;
  hideIfUnder10Percent?: boolean;
}) {
  const {
    data: { totalAmount } = {
      totalAmount: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroupId));
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const percent = Math.floor((totalAmount / goal) * 100);
  const atMost100 = percent > 100 ? 100 : percent;
  const atLeast1 = atMost100 < 1 && atMost100 !== 0 ? 1 : atMost100;

  const displayPercent = atLeast1;

  if (hideIfUnder10Percent && displayPercent < 10) {
    return null;
  }

  return (
    <div
      className={
        "relative w-full flex items-center h-[2rem] -mt-px ml-px mr-px overflow-hidden " +
        css`
          background-color: rgba(156, 163, 175, 0.2);
        `
      }
    >
      <div
        className={
          "h-full relative inline-flex pr-2 items-center justify-end " +
          css`
            background-color: ${artist?.properties?.colors?.primary ??
            "var(--mi-primary-color)"};
            transition: all 0.5s;
            width: ${displayPercent}%;
          `
        }
        aria-valuenow={totalAmount / 100}
        aria-valuemax={goal}
        aria-valuemin={0}
        role="progressbar"
      >
        {displayPercent > 10 && (
          <span className="invert font-bold whitespace-nowrap">
            {displayPercent.toFixed(0)} %
          </span>
        )}
      </div>
      {displayPercent <= 10 && (
        <span className="pl-3 font-bold whitespace-nowrap">
          {displayPercent.toFixed(0)} %
        </span>
      )}
    </div>
  );
}
export default Thermometer;
