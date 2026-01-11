import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { moneyDisplay } from "components/common/Money";
import { queryTrackGroupSupporters } from "queries";

import { Trans, useTranslation } from "react-i18next";

import BackOrIsBacking from "./BackOrIsBacking";
import { AnnouncementWrapper } from "components/ManageArtist/ManageArtistDetails/ManageArtistAnnouncement";

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
    data: { totalAmount, totalSupporters, total } = {
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
    },
  } = useQuery(queryTrackGroupSupporters(trackGroup.id));

  const percent = Math.min(Math.floor(totalAmount / goal), 100);

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
        className={
          "relative w-full flex items-center " +
          css`
            height: 2rem;
            background-color: rgba(156, 163, 175, 0.2);
            border-radius: 0.25rem;
            overflow: hidden;
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
              width: ${percent}%;
            `
          }
          aria-valuenow={totalAmount / 100}
          aria-valuemax={goal}
          aria-valuemin={0}
          role="progressbar"
        >
          {percent > 10 && (
            <span className="invert font-bold whitespace-nowrap">
              {percent.toFixed(0)} %
            </span>
          )}
        </div>
        {percent <= 10 && (
          <span className="pl-3 font-bold whitespace-nowrap">
            {percent.toFixed(0)} %
          </span>
        )}
      </div>
      {percent >= 100 && trackGroup.fundraiser?.isAllOrNothing && (
        <div className="mt-3">
          <AnnouncementWrapper artistColors={artist?.properties?.colors}>
            {t("allOrNothingFullyFunded")}
          </AnnouncementWrapper>
        </div>
      )}
    </div>
  );
}
export default Thermometer;
