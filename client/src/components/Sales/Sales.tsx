import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button, { ButtonLink } from "components/common/Button";
import DropdownMenu from "components/common/DropdownMenu";
import { moneyDisplay } from "components/common/Money";
import { SelectEl } from "components/common/Select";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import { queryManagedArtists, queryUserSales } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

import usePagination from "utils/usePagination";
import { FaDownload } from "react-icons/fa";
import api from "services/api";
import SalesRow from "./SalesRow";

const pageSize = 50;

export const Sales: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  const { page, PaginationComponent } = usePagination({ pageSize });
  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();

  const [datePurchased, setDatePurchased] = React.useState<string>("");
  const [isDownloadingCsv, setIsDownloadingCsv] = React.useState(false);

  const {
    data: { results, total, totalAmount, totalSupporters } = {
      results: [],
      total: 0,
    },
    isLoading,
  } = useQuery(
    queryUserSales({
      artistIds: filteredArtistId ? [filteredArtistId] : undefined,
      datePurchased: datePurchased || undefined,
      take: pageSize,
      skip: page * pageSize,
    })
  );

  const { data: managedArtists } = useQuery(queryManagedArtists());

  const downloadSalesData = React.useCallback(async () => {
    setIsDownloadingCsv(true);
    try {
      const params = new URLSearchParams();
      if (filteredArtistId) {
        params.append("artistIds", String(filteredArtistId));
      }
      if (datePurchased) {
        params.append("datePurchased", datePurchased);
      }
      params.append("format", "csv");

      await api.getFile(
        "sales",
        `manage/sales?${params.toString()}`,
        "text/csv"
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingCsv(false);
    }
  }, [filteredArtistId, datePurchased]);

  return (
    <WidthContainer
      className={css`
        padding: 1rem;
      `}
      variant={"big"}
    >
      <SpaceBetweenDiv>
        <h1
          className={css`
            margin: 0.5rem 0;
          `}
        >
          {t("sales")}
        </h1>
        <div className="flex gap-2 items-center">
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
          <SelectEl
            onChange={(e) => {
              setDatePurchased(e.target.value);
            }}
            value={datePurchased}
          >
            <option value="">All dates</option>
            <option value="thisMonth">Current month to date</option>
            <option value="previousMonth">Previous month</option>
            <option value="thisYear">Current year to date</option>
            <option value="lastYear">Last year</option>
          </SelectEl>

          <ButtonLink variant="outlined" to="/fulfillment">
            {t("viewFulfillment")}
          </ButtonLink>
          <DropdownMenu>
            <ul>
              <li>
                <Button
                  onClick={downloadSalesData}
                  size="compact"
                  startIcon={<FaDownload />}
                  isLoading={isDownloadingCsv}
                >
                  {t("downloadSalesData")}
                </Button>
              </li>
            </ul>
          </DropdownMenu>
        </div>
      </SpaceBetweenDiv>
      {results.length === 0 && !isLoading && (
        <p>{t(datePurchased ? "noSalesForThisPeriod" : "noSales")}</p>
      )}
      {isLoading && <LoadingBlocks rows={5} height="2rem" margin=".5rem" />}
      {(totalAmount ?? 0) > 0 && (
        <div
          className={css`
            padding-bottom: 1rem;
          `}
        >
          <p>
            <strong>{t("totalSalesIncome")}: </strong>
            {moneyDisplay({
              amount: (totalAmount ?? 0) / 100,
              currency: results[0]?.currency ?? "usd",
            })}
          </p>
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
                <th>{t("transactionId")}</th>
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
