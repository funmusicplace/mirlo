import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import FulfillmentRow from "./FulfillmentRow";
import { useQuery } from "@tanstack/react-query";
import { queryUserPurchases } from "queries";

export const Fulfillment: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const [results, setResults] = React.useState<MerchPurchase[]>([]);
  const [total, setTotal] = React.useState<number>();

  const callback = React.useCallback(async (search?: URLSearchParams) => {
    if (search) {
      search.append("orderBy", "createdAt");
    }
    const { results, total: totalResults } = await api.getMany<MerchPurchase>(
      `manage/purchases?${search?.toString()}`
    );
    setTotal(totalResults);
    setResults(results);
  }, []);
  const { data: purchaseResults, refetch } = useQuery(queryUserPurchases());

  React.useEffect(() => {
    callback();
  }, [callback]);

  return (
    <div
      className={css`
        flex-grow: 1;
        padding: 1rem;
        max-width: 100%;
      `}
    >
      <h3
        className={css`
          margin: 0.5rem 0;
        `}
      >
        {t("ordersAndFulfillment")}
      </h3>
      <h4>{t("totalResults", { count: purchaseResults?.total })}</h4>
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
                <th>{t("merchItem")}</th>
                <th>{t("customer")}</th>
                <th>{t("email")}</th>
                <th>{t("quantity")}</th>
                <th>{t("fulfillmentStatus")}</th>
                <th>{t("orderDate ")}</th>
                <th>{t("lastUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {purchaseResults?.results.map((purchase, index) => (
                <FulfillmentRow
                  key={purchase.id}
                  purchase={purchase}
                  index={index}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Fulfillment;
