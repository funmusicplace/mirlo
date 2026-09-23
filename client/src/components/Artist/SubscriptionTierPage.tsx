import styled from "@emotion/styled";
import MarkdownContent from "components/common/MarkdownContent";
import Money from "components/common/Money";
import PlatformPercent from "components/common/PlatformPercent";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaChevronRight, FaPen } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import {
  getArtistAllTiersUrl,
  getArtistManageTiersUrl,
  getArtistTierUrl,
} from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../constants";

import ArtistRouterLink, { ArtistButtonLink } from "./ArtistButtons";
import ArtistSupportBox from "./ArtistSupportBox";
import ChangePaymentMethodButton from "./ChangePaymentMethodButton";
import { isSubscriptionCancelled } from "./SubscriptionCancelledNotice";
import SubscriptionTierActions, {
  getUserSubscriptionToTier,
} from "./SubscriptionTierActions";
import SubscriptionTierReleases from "./SubscriptionTierReleases";
import SubscriptionTierRewards, {
  hasTierPerks,
  hasTierReleases,
} from "./SubscriptionTierRewards";

const TWO_COLUMN_DESCRIPTION_MIN_CHARS = 600;
const INCLUDED_RELEASES_MAX_ROWS = 2;
const INCLUDED_RELEASES_PER_ROW = 4;

const Layout = styled.article`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: nowrap;

  @media screen and (max-width: ${bp.small}px) {
    flex-direction: column;
  }
`;

const HeaderImage = styled.img`
  max-width: 60%;
  max-height: 400px;
  width: auto;
  height: auto;
  object-fit: contain;

  @media screen and (max-width: ${bp.small}px) {
    max-width: 100%;
  }
`;

const Description = styled.div<{ twoColumns: boolean }>`
  ${({ twoColumns }) =>
    twoColumns
      ? `
    @media screen and (min-width: ${Number(bp.medium) + 1}px) {
      columns: 2;
      column-gap: 3rem;

      > * > * {
        break-inside: avoid;
      }
    }
  `
      : ""}
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0 1 40%;
  min-width: 0;
  gap: 1rem;

  @media screen and (max-width: ${bp.small}px) {
    width: 100%;
  }
`;

const SubscriptionTierPage: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  artist: Artist;
}> = ({ subscriptionTier, artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { refetch } = useArtistQuery();
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.medium}px)`);

  const paidTiers = artist.subscriptionTiers.filter(
    (tier) => !tier.isDefaultTier
  );
  const currentIndex = paidTiers.findIndex(
    (tier) => tier.id === subscriptionTier.id
  );
  const previousTier = currentIndex > 0 ? paidTiers[currentIndex - 1] : null;
  const nextTier =
    currentIndex >= 0 && currentIndex < paidTiers.length - 1
      ? paidTiers[currentIndex + 1]
      : null;
  const hasSiblings = paidTiers.length > 1;
  const hasReleases = hasTierReleases(subscriptionTier);
  const hasPerks = hasTierPerks(subscriptionTier);
  const isOwner = !!user && user.id === artist.userId;
  const currentSubscription = getUserSubscriptionToTier(user, subscriptionTier);
  const paymentMethodSubscription =
    !isOwner &&
    currentSubscription &&
    !isSubscriptionCancelled(currentSubscription)
      ? currentSubscription
      : undefined;

  const currency = artist.user?.currency ?? "usd";
  const image = subscriptionTier.images?.[0]?.image;
  const hasImage = !!image?.sizes?.[1250];
  const amount = subscriptionTier.minAmount
    ? subscriptionTier.minAmount / 100
    : 0;

  const siblingsNav = hasSiblings && (
    <nav aria-label={t("support")} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 justify-start">
          {previousTier && (
            <ArtistButtonLink
              to={getArtistTierUrl(artist, previousTier)}
              variant="outlined"
              startIcon={<FaChevronLeft />}
              wrap
              className="min-w-0 text-left"
            >
              {previousTier.name}
            </ArtistButtonLink>
          )}
        </div>
        <div className="flex min-w-0 justify-end">
          {nextTier && (
            <ArtistButtonLink
              to={getArtistTierUrl(artist, nextTier)}
              variant="outlined"
              endIcon={<FaChevronRight />}
              wrap
              className="min-w-0 text-left"
            >
              {nextTier.name}
            </ArtistButtonLink>
          )}
        </div>
      </div>
      <ArtistRouterLink
        to={getArtistAllTiersUrl(artist)}
        className="text-center"
      >
        {t("seeAllTiers")}
      </ArtistRouterLink>
    </nav>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-6">
        <ArtistSupportBox
          subscriptionTier={subscriptionTier}
          showDetailsLink={false}
        />
        {siblingsNav}
      </div>
    );
  }

  return (
    <Layout>
      <HeaderRow>
        {hasImage && <HeaderImage src={image.sizes[1250]} alt="" />}
        <Details>
          {(isOwner || paymentMethodSubscription) && (
            <div className="flex justify-end">
              {isOwner && (
                <ArtistButtonLink
                  to={`${getArtistManageTiersUrl(artist.id)}/${subscriptionTier.id}`}
                  size="compact"
                  variant="dashed"
                  startIcon={<FaPen />}
                >
                  {t("editTier")}
                </ArtistButtonLink>
              )}
              {paymentMethodSubscription && (
                <ChangePaymentMethodButton
                  subscriptionId={paymentMethodSubscription.id}
                  onUpdated={() => refetch()}
                />
              )}
            </div>
          )}
          <div
            className={
              hasImage
                ? "flex flex-col flex-1 justify-center gap-4"
                : "flex flex-col items-center gap-4 text-center"
            }
          >
            <div className="flex flex-col gap-1">
              <h2
                className={
                  hasImage
                    ? "text-2xl md:text-3xl font-bold!"
                    : "text-3xl! md:text-4xl! font-bold!"
                }
              >
                {subscriptionTier.name}
              </h2>
              <div
                className={
                  "flex items-center gap-2 text-lg" +
                  (hasImage ? "" : " justify-center")
                }
              >
                <span>
                  <Money amount={amount} currency={currency} /> /{" "}
                  {t(
                    subscriptionTier.interval === "MONTH" ? "monthly" : "yearly"
                  )}
                </span>
                <PlatformPercent
                  percent={subscriptionTier.platformPercent}
                  chosenPrice={amount}
                  artistName={artist.name}
                  currency={currency}
                />
              </div>
            </div>
            <SubscriptionTierActions
              subscriptionTier={subscriptionTier}
              layout="page"
              supportButton={
                hasImage ? { size: "big", width: "100%" } : { width: "70%" }
              }
            />
          </div>
        </Details>
      </HeaderRow>
      <hr className="border-(--mi-tint-x-color)" />
      <section className="flex flex-col gap-4 mb-4">
        <h3 className="text-xl font-bold!">{t("whatYouGet")}</h3>
        {subscriptionTier.description && (
          <Description
            className="text-sm"
            twoColumns={
              subscriptionTier.description.length >=
              TWO_COLUMN_DESCRIPTION_MIN_CHARS
            }
          >
            <MarkdownContent content={subscriptionTier.description} />
          </Description>
        )}
      </section>
      {(hasReleases || hasPerks) && (
        <section className="flex flex-col gap-4 p-5 bg-(--mi-tint-color) border border-(--mi-tint-x-color)">
          <div className="flex flex-col gap-2">
            {hasReleases && (
              <h3 className="text-base! font-semibold! uppercase tracking-[0.08em] opacity-70">
                {t("includedReleases")}
              </h3>
            )}
            {hasPerks && (
              <SubscriptionTierRewards
                subscriptionTier={subscriptionTier}
                artistName={artist.name}
                includeReleases={false}
                className="text-[calc(var(--mi-font-size-small)*var(--page-scale,1))] font-bold list-disc pl-5"
              />
            )}
          </div>
          {hasReleases && (
            <SubscriptionTierReleases
              tier={subscriptionTier}
              artist={artist}
              maxItems={INCLUDED_RELEASES_MAX_ROWS * INCLUDED_RELEASES_PER_ROW}
            />
          )}
        </section>
      )}
      {siblingsNav}
    </Layout>
  );
};

export default SubscriptionTierPage;
