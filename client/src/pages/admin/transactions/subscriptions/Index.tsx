import { css } from "@emotion/css";
import Money from "components/common/Money";
import Table from "components/common/Table";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";

import useAdminFilters from "components/Admin/useAdminFilters";

interface AdminSubscription extends ArtistUserSubscription {
  user: User;
  artistSubscriptionTier: ArtistSubscriptionTier & {
    artist: Artist & { user: { currency: string | null } };
  };
  artistUserSubscriptionCharges: {
    id: string;
    createdAt: string;
    transaction: {
      amount: number;
      currency: string;
      paymentStatus: string;
    };
  }[];
}

const pageSize = 100;

export const Index: React.FC = () => {
  const [results, setResults] = React.useState<AdminSubscription[]>([]);
  const [totalCount, setTotal] = React.useState<number>();
  const { i18n } = useTranslation("translation", {
    keyPrefix: "admin",
  });
  const [searchParams] = useSearchParams();
  const { page, PaginationComponent } = usePagination({ pageSize });

  const callback = React.useCallback(async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();
    if (params) {
      params.append("orderBy", "createdAt");
    }
    params.set("skip", `${pageSize * page}`);
    params.set("take", `${pageSize}`);

    const { results, total: totalResults } =
      await api.getMany<AdminSubscription>(
        `admin/subscriptions?${params.toString()}`
      );
    setTotal(totalResults);
    setResults(results);
  }, [searchParams, page]);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["lastSubscription"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  const total = results.reduce((aggr, r) => {
    const currency = r.artistSubscriptionTier.artist.user?.currency ?? "usd";
    if (aggr[currency]) {
      aggr[currency] += r.amount;
    } else {
      aggr[currency] = r.amount;
    }
    return aggr;
  }, {} as any);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Subscriptions</h3>
      <Filters />
      <h4>Totals</h4>
      <Table
        className={css`
          margin-bottom: 2rem;
        `}
      >
        <thead>
          <tr>
            <th>Currency</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(total).map((currency) => (
            <tr key={currency}>
              <td>{currency}</td>
              <Money currency={currency} amount={total[currency] / 100} />
            </tr>
          ))}
        </tbody>
      </Table>

      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>User</th>
              <th>Subscription</th>
              <th>Artist</th>
              <th>Amount</th>
              <th>Last charge</th>
            </tr>
          </thead>
          <tbody>
            {results.map((sub, index) => (
              <tr key={sub.artistSubscriptionTierId + sub.userId}>
                <td>{index + 1}</td>

                <td>
                  {sub.user.email} (userId: {sub.userId})
                </td>
                <td>
                  {sub.artistSubscriptionTier.name} (id:{" "}
                  {sub.artistSubscriptionTier.id})
                </td>
                <td>
                  {sub.artistSubscriptionTier.artist.name} (id:{" "}
                  {sub.artistSubscriptionTier.artist.id})
                </td>
                <td>
                  <Money
                    amount={sub.amount / 100}
                    currency={
                      sub.artistSubscriptionTier.artist.user?.currency ?? "usd"
                    }
                  />
                </td>
                <td>
                  {sub.artistUserSubscriptionCharges.map((charge) => (
                    <>
                      <Money
                        amount={charge.transaction.amount / 100}
                        currency={charge.transaction.currency}
                      ></Money>
                      : {formatDate({ date: charge.createdAt, i18n })}
                    </>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
    </div>
  );
};

export default Index;
