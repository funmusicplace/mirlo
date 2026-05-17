import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ArtistFilter from "components/common/ArtistFilter";
import Button from "components/common/Button";
import DateRangeFilter, {
  DateRangeValue,
} from "components/common/DateRangeFilter";
import { moneyDisplay } from "components/common/Money";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import { queryManagedArtists, queryUserSales } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDownload } from "react-icons/fa";
import api from "services/api";
import usePagination from "utils/usePagination";

import SalesRow, { SalesCard } from "./SalesRow";

const pageSize = 50;

export const Sales: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  const { page, PaginationComponent } = usePagination({ pageSize });
  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();

  const [datePurchased, setDatePurchased] = React.useState<DateRangeValue>("");
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
    <WidthContainer className="p-4" variant="big">
      <h1 className="my-2">{t("sales")}</h1>
      {results.length === 0 && !isLoading && (
        <p>{t(datePurchased ? "noSalesForThisPeriod" : "noSales")}</p>
      )}
      {isLoading && <LoadingBlocks rows={5} height="2rem" margin=".5rem" />}
      {(totalAmount ?? 0) > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4">
          <div className="rounded-md border border-(--mi-tint-x-color) bg-(--mi-button-tint-color) p-4">
            <div className="text-xs uppercase tracking-wide text-(--mi-secondary-text-color)">
              {t("totalSalesIncome")}
            </div>
            <div className="text-2xl font-semibold mt-1">
              {moneyDisplay({
                amount: (totalAmount ?? 0) / 100,
                currency: results[0]?.currency ?? "usd",
              })}
            </div>
          </div>
          <div className="rounded-md border border-(--mi-tint-x-color) bg-(--mi-button-tint-color) p-4">
            <div className="text-xs uppercase tracking-wide text-(--mi-secondary-text-color)">
              {t("totalSales")}
            </div>
            <div className="text-2xl font-semibold mt-1">{total}</div>
          </div>
          <div className="rounded-md border border-(--mi-tint-x-color) bg-(--mi-button-tint-color) p-4">
            <div className="text-xs uppercase tracking-wide text-(--mi-secondary-text-color)">
              {t("totalSupporters")}
            </div>
            <div className="text-2xl font-semibold mt-1">{totalSupporters}</div>
          </div>
        </div>
      )}
      {(results.length > 0 || filteredArtistId || datePurchased) && (
        <div className="flex flex-wrap-reverse items-center gap-2 max-md:gap-y-4 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <ArtistFilter
              artists={managedArtists?.results ?? []}
              selectedArtistId={filteredArtistId ?? null}
              onChange={(id) => setFilteredArtistId(id ?? undefined)}
            />
            <DateRangeFilter
              value={datePurchased}
              onChange={setDatePurchased}
            />
          </div>
          <Button
            onClick={downloadSalesData}
            variant="outlined"
            startIcon={<FaDownload />}
            isLoading={isDownloadingCsv}
            className="ml-auto max-md:w-full"
          >
            {t("downloadSalesData")}
          </Button>
        </div>
      )}
      {results.length > 0 && (
        <>
          <div className="hidden md:block">
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
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {results.map((sale, index) => (
              <SalesCard key={sale.datePurchased + index} sale={sale} />
            ))}
          </ul>
          <PaginationComponent amount={results.length} total={total} />
        </>
      )}
    </WidthContainer>
  );
};

export default Sales;
