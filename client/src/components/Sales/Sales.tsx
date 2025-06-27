import { css } from "@emotion/css";
import Table from "components/common/Table";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import SalesRow from "./SalesRow";

export type Sale = {
  amount: number;
  artist: Partial<Artist>;
  currency: string;
  datePurchased: string;
  trackGroup?: Partial<TrackGroup>;
  merch?: Partial<Merch>;
  track?: Partial<Track>;
  artistSubscriptionTier?: Partial<ArtistSubscriptionTier>;
};

export const Sales: React.FC = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "sales",
  });
  const [results, setResults] = React.useState<Sale[]>([]);
  const [total, setTotal] = React.useState<number>();

  const callback = React.useCallback(async (search?: URLSearchParams) => {
    if (search) {
      search.append("orderBy", "createdAt");
    }
    const { results, total: totalResults } = await api.getMany<Sale>(
      `manage/sales?${search?.toString()}`
    );
    setTotal(totalResults);
    setResults(results);
  }, []);

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
        {t("sales")}
      </h3>
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
                <th>{t("amount")}</th>
                <th>{t("date")}</th>
                <th>{t("item")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((sale, index) => (
                <SalesRow
                  key={sale.datePurchased + index}
                  sale={sale}
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

export default Sales;
