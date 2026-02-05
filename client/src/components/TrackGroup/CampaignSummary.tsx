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

import ShareToSocials from "components/common/ShareToSocials";
import { useState } from "react";
import Thermometer from "./Thermometer";

function CampaignSummary({
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
    isPending,
  } = useQuery(queryTrackGroupSupporters(trackGroup.id));

  const { data: recommendedTrackGroups } = useQuery(
    queryPublicRecommendedTrackGroups(trackGroup.id)
  );

  const [searchParams] = useSearchParams();
  const [hasJustPledged] = useState(searchParams.get("setup_intent") || false);

  const percent = Math.floor(totalAmount / goal);

  if (isPending) {
    return <LoadingBlocks rows={1} height="2rem" margin="0.5rem 0" />;
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
                  amount: goal / 100,
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
      <Thermometer goal={goal} trackGroupId={trackGroup.id} artist={artist} />
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
export default CampaignSummary;
