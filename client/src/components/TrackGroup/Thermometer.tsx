import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { moneyDisplay } from "components/common/Money";
import {
  queryArtistSupporters,
  queryTrackGroupSupporters,
  queryUserStripeStatus,
} from "queries";

import { Trans, useTranslation } from "react-i18next";

import BackOrIsBacking from "./BackOrIsBacking";

function Thermometer({
  goal,
  artist,
  trackGroup,
}: {
  goal: number;
  artist: Artist;
  trackGroup: TrackGroup;
}) {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    data: { totalAmount, totalSupporters } = {
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroup.id));

  const percent = Math.min(totalAmount / goal, 100);
  return (
    <div className="text-sm md:text-base">
      <div className="flex items-center justify-between mb-1 relative w-full">
        <div
          className={css`
            display: flex;
            flex-direction: row;
            align-items: flex-end;
          `}
        >
          <span>
            <Trans
              t={t}
              i18nKey="raisedAmount"
              values={{
                money: moneyDisplay({
                  amount: totalAmount / 100,
                  currency: trackGroup?.currency,
                }),
              }}
              components={{
                strong: <strong></strong>,
              }}
            />
          </span>
          <span className="ml-2 mt-2 text-gray-500 hidden md:inline">
            <Trans
              t={t}
              i18nKey="fromXSupporters"
              values={{
                supporters: totalSupporters,
              }}
            />
          </span>
        </div>
        <div className="flex items-center justify-end gap-1 w-2/3 md:w-1/2 lg:w-1/3">
          <div className="">
            <Trans
              t={t}
              i18nKey="ofGoal"
              values={{
                goal: moneyDisplay({
                  amount: goal,
                  currency: trackGroup?.currency,
                }),
              }}
              components={{
                strong: <strong></strong>,
              }}
            />
          </div>
          <BackOrIsBacking artist={artist} trackGroup={trackGroup} />
        </div>
      </div>
      <div
        className={css`
          position: relative;
          width: 100%;
          height: 1.25rem;
          background-color: rgba(156, 163, 175, 0.2);
          border-radius: 0.25rem;
          overflow: hidden;
        `}
      >
        <div
          className={css`
            height: 100%;
            background-color: ${artist?.properties?.colors?.primary};
            transition: all 0.5s;
            position: relative;
            width: ${percent}%;
          `}
          aria-valuenow={totalAmount / 100}
          aria-valuemax={goal}
          aria-valuemin={0}
          role="progressbar"
        ></div>
      </div>
    </div>
  );
}
export default Thermometer;
