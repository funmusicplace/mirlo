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
  current,
  goal,
  artist,
  trackGroup,
}: {
  current: number;
  goal: number;
  artist: Artist;
  trackGroup: TrackGroup;
}) {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    data: { results, total, totalAmount, totalSupporters } = {
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroup.id));

  const percent = Math.min(totalAmount / goal, 100);
  return (
    <div>
      <div
        className={css`
          position: relative;
          width: 100%;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        `}
      >
        <div
          className={css`
            display: flex;
            flex-direction: row;
            align-items: flex-end;
          `}
        >
          <span
            className={css`
              font-size: 1rem;
            `}
          >
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
          <span
            className={css`
              margin-top: 0.35rem;
              font-style: italic;
              margin-left: 0.25rem;
            `}
          >
            <Trans
              t={t}
              i18nKey="fromXSupporters"
              values={{
                supporters: totalSupporters,
              }}
            />
          </span>
        </div>
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.76rem;
            width: 50%;
          `}
        >
          <div
            className={css`
              margin-left: 0.5rem;
              font-size: 1rem;
              margin-top: 0.35rem;
            `}
          >
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
