import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ArtistSubscriberDataDownload from "./ArtistSubscriberDataDownload";
import Table from "components/common/Table";
import api from "services/api";
import React from "react";
import { ArtistSection } from "components/Artist/Artist";
import Money from "components/common/Money";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import ArtistSubscriberUploadData from "./ArtistSubscriberUploadData";
import DropdownMenu from "components/common/DropdownMenu";
import { css } from "@emotion/css";
import { sumBy } from "lodash";
import { useTranslation } from "react-i18next";
import useArtistQuery from "utils/useArtistQuery";

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
  user: User;
  amount: number;
  artistSubscriptionTier: ArtistSubscriptionTier;
};

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

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h4>{t("supporters")}</h4>

          <DropdownMenu dashed>
            <ArtistSubscriberDataDownload />
            <ArtistSubscriberUploadData onDone={loadSupporters} />
          </DropdownMenu>
        </div>
        <div className="flex gap-1 flex-col max-w-1/2">
          <p className="grid gap-4 grid-cols-2">
            {t("totalComingInMonthly")}:{" "}
            <strong className="text-right">
              <Money
                amount={amountMonthly / 100}
                currency={
                  monthlySupporters[0]?.artistSubscriptionTier.currency ??
                  artist?.user?.currency ??
                  "usd"
                }
              />
            </strong>
          </p>
          <p className="grid gap-4 grid-cols-2">
            {t("totalComingInAnnually")}:{" "}
            <strong className="text-right">
              <Money
                amount={amountAnnual / 100}
                currency={
                  annualSupporters[0]?.artistSubscriptionTier.currency ??
                  artist?.user?.currency ??
                  "usd"
                }
              />
            </strong>
          </p>
          <p className="grid gap-4 grid-cols-2">
            {t("totalProjectedAnnual")}:{" "}
            <strong className="text-right">
              <Money
                amount={(amountAnnual + amountMonthly * 12) / 100}
                currency={
                  annualSupporters[0]?.artistSubscriptionTier.currency ??
                  artist?.user?.currency ??
                  "usd"
                }
              />
            </strong>
          </p>
          <p>
            {t("totalSupporters", {
              count: monthlySupporters.length + annualSupporters.length,
            })}
          </p>
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
                <td>{r.artistSubscriptionTier.name}</td>
                <td>
                  {r.artistSubscriptionTier.interval === "MONTH"
                    ? t("monthly")
                    : t("yearly")}
                </td>
                <td>
                  <Money
                    amount={r.amount / 100}
                    currency={
                      r.artistSubscriptionTier.currency ??
                      artist?.user?.currency ??
                      "usd"
                    }
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
              background: var(--mi-lighten-x-background-color);
            `}
          >
            {t("noSupportersYet")}
          </div>
        )}
      </div>
      <ArtistSection>
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
    </>
  );
};

export default Supporters;
