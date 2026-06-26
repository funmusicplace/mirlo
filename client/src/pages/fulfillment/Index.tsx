import { useQuery } from "@tanstack/react-query";
import ArtistFilter from "components/common/ArtistFilter";
import Button from "components/common/Button";
import DateRangeFilter, {
  DateRangeValue,
} from "components/common/DateRangeFilter";
import StatCard from "components/common/StatCard";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import { queryUserPurchases, queryManagedArtists } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDownload } from "react-icons/fa";
import api from "services/api";
import usePagination from "utils/usePagination";

import { FulfillmentCard } from "components/FulFillment/FulfillmentCard";
import FulfillmentRow from "components/FulFillment/FulfillmentRow";

const pageSize = 50;

export const Fulfillment: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const [isLoadingFulfillments, setIsLoadingFulfillments] =
    React.useState(false);
  const [filteredArtistId, setFilteredArtistId] = React.useState<number>();
  const [datePurchased, setDatePurchased] = React.useState<DateRangeValue>("");
  const { page, PaginationComponent } = usePagination({ pageSize });

  const downloadOrderData = React.useCallback(async () => {
    setIsLoadingFulfillments(true);
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
        "fulfillments",
        `manage/purchases?${params.toString()}`,
        "text/csv"
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFulfillments(false);
    }
  }, [filteredArtistId, datePurchased]);

  const { data: purchaseResults } = useQuery(
    queryUserPurchases({
      artistIds: filteredArtistId ? [filteredArtistId] : undefined,
      datePurchased: datePurchased || undefined,
      take: pageSize,
      skip: page * pageSize,
    })
  );

  const { data: managedArtists } = useQuery(queryManagedArtists());

  return (
    <WidthContainer variant="big">
      <h1>{t("ordersAndFulfillment")}</h1>
      <p>{t("fulfillmentDescription")}</p>
      {(purchaseResults?.results.length ?? 0) > 0 &&
        (() => {
          const counts = {
            NO_PROGRESS: 0,
            STARTED: 0,
            SHIPPED: 0,
            COMPLETED: 0,
          };
          for (const p of purchaseResults?.results ?? []) {
            counts[p.fulfillmentStatus] =
              (counts[p.fulfillmentStatus] ?? 0) + 1;
          }
          const statusKeys = [
            { key: "NO_PROGRESS", labelKey: "noProgress" },
            { key: "STARTED", labelKey: "started" },
            { key: "SHIPPED", labelKey: "shipped" },
            { key: "COMPLETED", labelKey: "completed" },
          ] as const;
          return (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 my-4">
              {statusKeys.map(({ key, labelKey }) => (
                <StatCard key={key} label={t(labelKey)} value={counts[key]} />
              ))}
            </div>
          );
        })()}
      <div className="flex flex-wrap-reverse items-center gap-2 max-md:gap-y-4 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <ArtistFilter
            artists={managedArtists?.results ?? []}
            selectedArtistId={filteredArtistId ?? null}
            onChange={(id) => setFilteredArtistId(id ?? undefined)}
          />
          <DateRangeFilter value={datePurchased} onChange={setDatePurchased} />
        </div>
        <Button
          wrap
          onClick={downloadOrderData}
          variant="outlined"
          startIcon={<FaDownload />}
          isLoading={isLoadingFulfillments}
          className="ml-auto max-md:w-full"
        >
          {t("downloadOrderData")}
        </Button>
      </div>
      {(purchaseResults?.results.length ?? 0) > 0 && (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <th />
                  <th>{t("artist")}</th>
                  <th>{t("merchItem")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("email")}</th>
                  <th>{t("quantity")}</th>
                  <th>{t("type")}</th>
                  <th>{t("fulfillmentStatus")}</th>
                  <th>{t("orderDate")}</th>
                  <th>{t("lastUpdated")}</th>
                </tr>
              </thead>
              <tbody>
                {purchaseResults?.results.map((purchase) => (
                  <FulfillmentRow key={purchase.id} purchase={purchase} />
                ))}
              </tbody>
            </Table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {purchaseResults?.results.map((purchase) => (
              <FulfillmentCard key={purchase.id} purchase={purchase} />
            ))}
          </ul>
          <PaginationComponent
            amount={purchaseResults?.results.length ?? 0}
            total={purchaseResults?.total ?? 0}
          />
        </>
      )}
    </WidthContainer>
  );
};

export default Fulfillment;
