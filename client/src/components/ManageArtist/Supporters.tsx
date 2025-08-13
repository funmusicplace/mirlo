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

  const amount = sumBy([...monthlySupporters, ...annualSupporters], "amount");

  return (
    <>
      <ArtistSection>
        <SpaceBetweenDiv>
          <div>
            <h4>{t("supporters")}</h4>
            {t("totalComingInMonthly")}:{" "}
            <Money
              amount={amount / 100}
              currency={
                monthlySupporters[0]?.artistSubscriptionTier.currency ??
                artist?.user?.currency ??
                "usd"
              }
            />
            <br />
            {t("totalComingInAnnually")}:{" "}
            <Money
              amount={amount / 100}
              currency={
                annualSupporters[0]?.artistSubscriptionTier.currency ??
                artist?.user?.currency ??
                "usd"
              }
            />
            <br />
            {t("totalSupporters", {
              count: monthlySupporters.length + annualSupporters.length,
            })}
          </div>
          <DropdownMenu dashed>
            <ArtistSubscriberDataDownload />
            <ArtistSubscriberUploadData onDone={loadSupporters} />
          </DropdownMenu>
        </SpaceBetweenDiv>
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
      </ArtistSection>
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
