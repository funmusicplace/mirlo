import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import SalesRow from "./SalesRow";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtists, queryUserSales } from "queries";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import WidthContainer from "components/common/WidthContainer";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { SelectEl } from "components/common/Select";
import Button, { ButtonLink } from "components/common/Button";
import usePagination from "utils/usePagination";
import { moneyDisplay } from "components/common/Money";
import { FaDownload } from "react-icons/fa";
import api from "services/api";
import DropdownMenu from "components/common/DropdownMenu";

const pageSize = 50;

export const Sales: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  const { page, PaginationComponent } = usePagination({ pageSize });
  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();
  const [isDownloading, setIsDownloading] = React.useState(false);

  const downloadSalesData = React.useCallback(async () => {
    setIsDownloading(true);
    try {
      const params = filteredArtistId ? `&artistIds=${filteredArtistId}` : "";
      await api.getFile(
        "sales",
        `manage/sales?format=csv${params}`,
        "text/csv"
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  }, [filteredArtistId]);
  const [datePurchased, setDatePurchased] = React.useState<string>("");

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
                  isLoading={isDownloading}
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
