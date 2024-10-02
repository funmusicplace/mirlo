import { css } from "@emotion/css";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Link } from "react-router-dom";
import api from "services/api";
import { getReleaseUrl } from "utils/artist";
import useAdminFilters from "./useAdminFilters";
import usePagination from "utils/usePagination";

interface AdminPurchase extends UserTrackGroupPurchase {
  user: User;
  trackGroup: TrackGroup;
}

const pageSize = 500;

export const AdminPurchases: React.FC = () => {
  const [results, setResults] = React.useState<AdminPurchase[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });

  const callback = React.useCallback(
    async (search?: URLSearchParams) => {
      const params = search ? search : new URLSearchParams();

      params.append("orderBy", "datePurchased");
      params.append("skip", `${pageSize * page}`);
      params.append("take", `${pageSize}`);

      const { results } = await api.getMany<AdminPurchase>(
        `admin/purchases?${params.toString() ?? ""}`
      );
      setResults(results);
    },
    [page]
  );

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["datePurchased", "pricePaid"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  const total = results.reduce((aggr, r) => {
    const currencyPaid = r.currencyPaid.toLowerCase();
    if (aggr[currencyPaid]) {
      aggr[currencyPaid] += r.pricePaid;
    } else {
      aggr[currencyPaid] = r.pricePaid;
    }
    return aggr;
  }, {} as any);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Purchases</h3>
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
              <Money amount={total[currency] / 100} currency={currency} />
            </tr>
          ))}
        </tbody>
      </Table>
      <h4>All</h4>
      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>User</th>
              <th>TrackGroup</th>
              <th>Date purchased</th>
              <th>Amount paid</th>
            </tr>
          </thead>
          <tbody>
            {results.map((purchase, index) => (
              <tr key={purchase.trackGroupId + purchase.userId}>
                <td>{index + 1}</td>

                <td>
                  {purchase.user.email} (userId: {purchase.userId})
                </td>
                <td>
                  <Link
                    to={getReleaseUrl(
                      purchase.trackGroup.artist ?? {
                        id: purchase.trackGroup.artistId!,
                      },
                      purchase.trackGroup
                    )}
                  >
                    {purchase.trackGroup.title}
                  </Link>{" "}
                  (id: {purchase.trackGroup.id})
                </td>
                <td>{purchase.datePurchased}</td>
                <td>
                  <Money
                    amount={purchase.pricePaid / 100}
                    currency={purchase.currencyPaid}
                  />
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

export default AdminPurchases;
