import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { moneyDisplay } from "components/common/Money";
import {
  queryPublicRecommendedTrackGroups,
  queryTrackGroupSupporters,
} from "queries";

import { Trans, useTranslation } from "react-i18next";

import BackOrIsBacking from "./BackOrIsBacking";
import { AnnouncementWrapper } from "components/ManageArtist/ManageArtistDetails/ManageArtistAnnouncement";
import { useSearchParams } from "react-router-dom";
import Confetti from "components/common/Confetti";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ArtistRouterLink from "components/Artist/ArtistButtons";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { getReleaseUrl } from "utils/artist";
import Button from "components/common/Button";
import { FaShareAlt } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import ShareToSocials from "components/common/ShareToSocials";

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
    isPending,
  } = useQuery(queryTrackGroupSupporters(trackGroup.id));

  const { data: recommendedTrackGroups } = useQuery(
    queryPublicRecommendedTrackGroups(trackGroup.id)
  );

  const [searchParams] = useSearchParams();
  const hasJustPledged = searchParams.get("setup_intent") || false;

  const percent = Math.floor(totalAmount / goal);
  const atMost100 = percent > 100 ? 100 : percent;
  const atLeast1 = atMost100 < 1 && atMost100 !== 0 ? 1 : atMost100;

  const displayPercent = atLeast1;

  if (isPending) {
    return <LoadingBlocks rows={2} />;
  }

  return (
    <div className="text-sm md:text-base">
      <div className="mb-1 relative w-full pt-5">
        {trackGroup.fundraiser?.isAllOrNothing && hasJustPledged && (
          <div className="px-2 py-10 flex flex-col md:flex-row items-start gap-4 justify-between">
            <div className="flex flex-row items-center">
              <div className="w-15 mr-8">
                <Confetti />
              </div>
              <div>
                <h3>{t("thankYouForYourPledge")}</h3>
                <p>{t("youWillBeChargedWhenItsFullyFunded")}</p>
                <div className="mt-4">
                  <ShareToSocials
                    url={`${window.location.origin}${window.location.pathname}`}
                    title={trackGroup.title ?? ""}
                  />
                </div>
              </div>
            </div>

            {recommendedTrackGroups?.results && (
              <div className="m:self-end m:ml-20">
                <h3>{t("youMightAlsoLike")}</h3>
                <div className=" h-20">
                  {recommendedTrackGroups?.results?.map((rec: TrackGroup) => (
                    <ArtistRouterLink
                      to={getReleaseUrl(rec.artist, rec)}
                      key={rec.id}
                      className="no-underline! text-inherit hover:opacity-80 transition-opacity"
                    >
                      <ImageWithPlaceholder
                        src={rec.cover?.sizes?.[120]}
                        alt={rec.title ?? ""}
                        size={120}
                      />
                      <p className="mt-2 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                        {rec.title}
                      </p>
                    </ArtistRouterLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
          </span>{" "}
          <div className="ml-1">
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
      <div
        className={"w-full relative inline-flex pt-2 items-center justify-end"}
      >
        <BackOrIsBacking artist={artist} trackGroup={trackGroup} />
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
