import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import DropdownMenu from "components/common/DropdownMenu";
import Money, { moneyDisplay } from "components/common/Money";
import Pill from "components/common/Pill";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import StatCard from "components/common/StatCard";
import Table from "components/common/Table";
import ArtistSubscriberDataDownload from "components/ManageArtist/ArtistSubscriberDataDownload";
import ArtistSubscriberUploadData from "components/ManageArtist/ArtistSubscriberUploadData";
import { ManageSectionWrapper } from "components/ManageArtist/ManageSectionWrapper";
import { sumBy } from "lodash";
import { ArtistSection } from "pages/{artistId}/Index";
import { queryManageArtistSubscribers } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import useArtistQuery from "utils/useArtistQuery";

import { bp } from "../../../../../../constants";

export const SupporterTable = styled(Table)`
  @media screen and (max-width: ${bp.small}px) {
    & td,
    &th {
      max-width: 90px;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
`;

type SupportTier = {
  id: number;
  user: User;
  createdAt: string;
  amount: number;
  artistSubscriptionTier: ArtistSubscriptionTier;
  artistUserSubscriptionCharges?: {
    id: string;
    transactionId?: string;
    // Charges are returned newest-first. The transaction carries the actual
    // fees Stripe and Mirlo took for that charge (in cents).
    transaction?: {
      platformCut: number | null;
      stripeCut: number | null;
      paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
    } | null;
  }[];
};

// A subscription with no associated transaction was added by the artist
// without payment (e.g. a comp), so we surface it as "Free".
const isFreeSubscription = (r: SupportTier) =>
  !r.artistUserSubscriptionCharges?.some((charge) => charge.transactionId);

// Stripe's standard processing fee (2.9% + $0.30 per transaction), matching
// the estimate used in PlatformPercent.tsx. Amounts are in major units here.
const STRIPE_PERCENT_FEE = 0.029;
const STRIPE_FLAT_FEE = 0.3;

// The most recent completed charge carries the real fees Stripe and Mirlo
// took. Charges arrive newest-first from the API.
const latestCompletedCharge = (r: SupportTier) =>
  r.artistUserSubscriptionCharges?.find(
    (c) => c.transaction?.paymentStatus === "COMPLETED"
  );

// Sums the platform + Stripe fees deducted from a set of supporters each
// billing cycle. Free comp subscriptions incur no fees. For subscriptions
// that have already been billed we use the actual amounts recorded on the
// transaction; for any paying subscription not yet billed we fall back to an
// estimate (platform percent + Stripe's 2.9% + $0.30) and flag the result.
const sumDeductions = (supporters: SupportTier[]) => {
  let platformFee = 0;
  let stripeFee = 0;
  let isEstimated = false;

  for (const r of supporters) {
    if (isFreeSubscription(r)) {
      continue;
    }

    const transaction = latestCompletedCharge(r)?.transaction;
    if (transaction && transaction.stripeCut != null) {
      platformFee += (transaction.platformCut ?? 0) / 100;
      stripeFee += transaction.stripeCut / 100;
    } else {
      const amount = r.amount / 100;
      platformFee +=
        amount * ((r.artistSubscriptionTier.platformPercent ?? 7) / 100);
      stripeFee += amount * STRIPE_PERCENT_FEE + STRIPE_FLAT_FEE;
      isEstimated = true;
    }
  }

  return {
    platformFee,
    stripeFee,
    total: platformFee + stripeFee,
    isEstimated,
  };
};

const Index = () => {
  const { data: artist } = useArtistQuery();
  const artistId = artist?.id;
  const { t } = useTranslation("translation", {
    keyPrefix: "artistSupporters",
  });
  const { data: subscribersData, refetch } = useQuery(
    queryManageArtistSubscribers({ artistId })
  );

  const subscribers = React.useMemo(
    () => (subscribersData?.results ?? []) as SupportTier[],
    [subscribersData]
  );

  const monthlySupporters = React.useMemo(
    () =>
      subscribers.filter(
        (r) =>
          !r.artistSubscriptionTier.isDefaultTier &&
          r.artistSubscriptionTier.interval === "MONTH"
      ),
    [subscribers]
  );
  const annualSupporters = React.useMemo(
    () =>
      subscribers.filter(
        (r) =>
          !r.artistSubscriptionTier.isDefaultTier &&
          r.artistSubscriptionTier.interval === "YEAR"
      ),
    [subscribers]
  );
  const followers = React.useMemo(
    () => subscribers.filter((r) => r.artistSubscriptionTier.isDefaultTier),
    [subscribers]
  );

  const amountMonthly = sumBy(monthlySupporters, "amount");
  const amountAnnual = sumBy(annualSupporters, "amount");

  const monthlyDeductions = sumDeductions(monthlySupporters);

  const currency = artist?.user?.currency ?? "usd";

  const totalSupporters = monthlySupporters.length + annualSupporters.length;

  return (
    <ManageSectionWrapper>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h4>{t("supporters")}</h4>

          <DropdownMenu dashed>
            <ArtistSubscriberDataDownload />
            <ArtistSubscriberUploadData onDone={() => refetch()} />
          </DropdownMenu>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-4">
          <StatCard
            label={t("totalComingInMonthly")}
            value={moneyDisplay({ amount: amountMonthly / 100, currency })}
            subtext={
              monthlyDeductions.total > 0 && (
                <>
                  <div>
                    {t("lessPlatformFee", {
                      amount: moneyDisplay({
                        amount: monthlyDeductions.platformFee,
                        currency,
                      }),
                    })}
                  </div>
                  <div>
                    {t(
                      monthlyDeductions.isEstimated
                        ? "lessStripeFeeEstimated"
                        : "lessStripeFee",
                      {
                        amount: moneyDisplay({
                          amount: monthlyDeductions.stripeFee,
                          currency,
                        }),
                      }
                    )}
                  </div>
                  <div className="font-semibold">
                    {t("netMonthly", {
                      amount: moneyDisplay({
                        amount: amountMonthly / 100 - monthlyDeductions.total,
                        currency,
                      }),
                    })}
                  </div>
                </>
              )
            }
          />
          <StatCard
            label={t("totalComingInAnnually")}
            value={moneyDisplay({ amount: amountAnnual / 100, currency })}
          />
          <StatCard
            label={t("totalProjectedAnnual")}
            value={moneyDisplay({
              amount: (amountAnnual + amountMonthly * 12) / 100,
              currency,
            })}
          />
          <StatCard label={t("supporters")} value={totalSupporters} />
        </div>
        <SupporterTable>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("email")}</th>
              <th>{t("tier")}</th>
              <th>{t("interval")}</th>
              <th>{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {[...monthlySupporters, ...annualSupporters]
              .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
              .map((r) => (
                <tr key={r.user.id}>
                  <td>{r.user.name ?? "-"}</td>
                  <td>{r.user.email}</td>
                  <td>
                    {r.artistSubscriptionTier.name}
                    {isFreeSubscription(r) && (
                      <Pill
                        className={css`
                          margin-left: 0.5rem;
                        `}
                      >
                        {t("free")}
                      </Pill>
                    )}
                  </td>
                  <td>
                    {r.artistSubscriptionTier.interval === "MONTH"
                      ? t("monthly")
                      : t("yearly")}
                  </td>
                  <td>
                    <Money
                      amount={r.amount / 100}
                      currency={artist?.user?.currency ?? "usd"}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </SupporterTable>
        {monthlySupporters.length + annualSupporters.length === 0 && (
          <div
            className={css`
              padding: 2rem;
              text-align: center;
              width: 100%;
              background: var(--mi-tint-x-color);
            `}
          >
            {t("noSupportersYet")}
          </div>
        )}
      </div>
      <ArtistSection className="mt-8!">
        <SpaceBetweenDiv>
          <h4>{t("followers", { count: followers.length })}</h4>
        </SpaceBetweenDiv>
        <SupporterTable>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("email")}</th>
            </tr>
          </thead>
          <tbody>
            {followers.map((r) => (
              <tr key={r.user.id}>
                <td>{r.user.name}</td>
                <td>{r.user.email}</td>
              </tr>
            ))}
          </tbody>
        </SupporterTable>
      </ArtistSection>
    </ManageSectionWrapper>
  );
};

export default Index;
