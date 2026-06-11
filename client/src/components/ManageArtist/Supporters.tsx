import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { ArtistSection } from "components/Artist/Artist";
import DropdownMenu from "components/common/DropdownMenu";
import Money, { moneyDisplay } from "components/common/Money";
import Pill from "components/common/Pill";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import StatCard from "components/common/StatCard";
import Table from "components/common/Table";
import { sumBy } from "lodash";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useArtistQuery from "utils/useArtistQuery";

import { bp } from "../../constants";

import ArtistSubscriberDataDownload from "./ArtistSubscriberDataDownload";
import ArtistSubscriberUploadData from "./ArtistSubscriberUploadData";
import { ManageSectionWrapper } from "./ManageSectionWrapper";

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
  amount: number;
  artistSubscriptionTier: ArtistSubscriptionTier;
  artistUserSubscriptionCharges?: { id: string; transactionId?: string }[];
};

// A subscription with no associated transaction was added by the artist
// without payment (e.g. a comp), so we surface it as "Free".
const isFreeSubscription = (r: SupportTier) =>
  !r.artistUserSubscriptionCharges?.some((charge) => charge.transactionId);

const Supporters = () => {
  const { data: artist } = useArtistQuery();
  const artistId = artist?.id;
  const { t } = useTranslation("translation", {
    keyPrefix: "artistSupporters",
  });
  const userId = artist?.userId;
  const [monthlySupporters, setMonthlySupporters] = React.useState<
    SupportTier[]
  >([]);
  const [annualSupporters, setAnnualSupporters] = React.useState<SupportTier[]>(
    []
  );
  const [followers, setFollowers] = React.useState<SupportTier[]>([]);

  const loadSupporters = React.useCallback(async () => {
    const response = await api.getMany<SupportTier>(
      `manage/artists/${artistId}/subscribers`
    );

    setMonthlySupporters(
      response.results.filter(
        (r) =>
          !r.artistSubscriptionTier.isDefaultTier &&
          r.artistSubscriptionTier.interval === "MONTH"
      )
    );
    setAnnualSupporters(
      response.results.filter(
        (r) =>
          !r.artistSubscriptionTier.isDefaultTier &&
          r.artistSubscriptionTier.interval === "YEAR"
      )
    );
    setFollowers(
      response.results.filter((r) => r.artistSubscriptionTier.isDefaultTier)
    );
  }, [artistId, userId]);

  React.useEffect(() => {
    loadSupporters();
  }, [loadSupporters]);

  const amountMonthly = sumBy(monthlySupporters, "amount");
  const amountAnnual = sumBy(annualSupporters, "amount");

  const currency = artist?.user?.currency ?? "usd";

  const totalSupporters = monthlySupporters.length + annualSupporters.length;

  return (
    <ManageSectionWrapper>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h4>{t("supporters")}</h4>

          <DropdownMenu dashed>
            <ArtistSubscriberDataDownload />
            <ArtistSubscriberUploadData onDone={loadSupporters} />
          </DropdownMenu>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-4">
          <StatCard
            label={t("totalComingInMonthly")}
            value={moneyDisplay({ amount: amountMonthly / 100, currency })}
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
            {[...monthlySupporters, ...annualSupporters].map((r) => (
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

export default Supporters;
