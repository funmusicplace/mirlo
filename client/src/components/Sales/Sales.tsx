import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import SalesRow from "./SalesRow";
import { useQueries, useQuery } from "@tanstack/react-query";
import { queryManagedArtists, queryUserSales } from "queries";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import WidthContainer from "components/common/WidthContainer";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { SelectEl } from "components/common/Select";
import { ButtonLink } from "components/common/Button";
import usePagination from "utils/usePagination";
import { moneyDisplay } from "components/common/Money";

const pageSize = 50;

export const Sales: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  const { page, PaginationComponent } = usePagination({ pageSize });
  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();

  const {
    data: { results, total, totalAmount, totalSupporters } = {
      results: [],
      total: 0,
    },
    isLoading,
  } = useQuery(
    queryUserSales({
      artistIds: filteredArtistId ? [filteredArtistId] : undefined,
      take: pageSize,
      skip: page * pageSize,
    })
  );

  const { data: managedArtists } = useQuery(queryManagedArtists());

  return (
    <WidthContainer
      className={css`
        padding: 1rem;
      `}
      variant={"big"}
    >
      <SpaceBetweenDiv>
        <h3
          className={css`
            margin: 0.5rem 0;
          `}
        >
          {t("sales")}
        </h3>
        <div
          className={css`
            display: flex;
            gap: 1rem;
          `}
        >
          <SelectEl
            onChange={(e) => {
              const artistId = e.target.value
                ? Number(e.target.value)
                : undefined;
              setFilteredArtistId(artistId);
            }}
            value={filteredArtistId ?? ""}
          >
            <option value="">{t("selectArtist")}</option>
            {managedArtists?.results.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </SelectEl>
          <ButtonLink variant="outlined" to="/fulfillment">
            {t("viewFulfillment")}
          </ButtonLink>
        </div>
      </SpaceBetweenDiv>
      {isLoading && <LoadingBlocks rows={5} height="2rem" margin=".5rem" />}
      {totalAmount && totalAmount > 0 && (
        <div
          className={css`
            padding-bottom: 1rem;
          `}
        >
          <p>
            <strong>{t("totalSalesIncome")}: </strong>
            {moneyDisplay({
              amount: totalAmount / 100,
              currency: "USD",
            })}
          </p>{" "}
          <p>
            <strong>{t("totalSales")}: </strong>
            {total}
          </p>
          <p>
            <strong>{t("totalSupporters")}: </strong>
            {totalSupporters}
          </p>
        </div>
      )}
      {results.length > 0 && (
        <div
          className={css`
            max-width: 100%;
            overflow-x: auto;
            background-color: var(--mi-lighten-background-color);
          `}
        >
          <Table>
            <thead>
              <tr>
                <th />
                <th>{t("artist")}</th>
                <th>{t("type")}</th>
                <th>{t("date")}</th>
                <th>{t("amount")}</th>
                <th>{t("platformCut")}</th>
                <th>{t("paymentProcessorCut")}</th>
                <th>{t("item")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((sale, index) => (
                <SalesRow key={sale.datePurchased + index} sale={sale} />
              ))}
            </tbody>
          </Table>
          <PaginationComponent amount={results.length} total={total} />
        </div>
      )}
    </WidthContainer>
  );
};

export default Sales;
