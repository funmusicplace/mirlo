import { css } from "@emotion/css";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "services/api";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import useAdminFilters from "./useAdminFilters";
import usePagination from "utils/usePagination";

interface AdminPurchase extends UserArtistTip {
  user: User;
  artist: Artist;
}

const pageSize = 500;

export const AdminTips: React.FC = () => {
  const [results, setResults] = React.useState<AdminPurchase[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [searchParams] = useSearchParams();

  const callback = React.useCallback(async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();
    params.append("orderBy", "datePurchased");
    params.append("skip", `${pageSize * page}`);
    params.append("take", `${pageSize}`);

    const { results } = await api.getMany<AdminPurchase>(
      `admin/tips?${params.toString() ?? ""}`
    );
    setResults(results);
  }, [searchParams, page]);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["datePurchased", "pricePaid"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  const total = results.reduce((aggr, r) => {
    if (aggr[r.currencyPaid]) {
      aggr[r.currencyPaid] += r.pricePaid;
    } else {
      aggr[r.currencyPaid] = r.pricePaid;
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
              <th>Artist</th>
              <th>Date purchased</th>
              <th>Amount paid</th>
            </tr>
          </thead>
          <tbody>
            {results.map((tip, index) => (
              <tr key={tip.artistId + tip.userId}>
                <td>{index + 1}</td>

                <td>
                  {tip.user.email} (userId: {tip.userId})
                </td>
                <td>
                  <Link
                    to={getArtistUrl(
                      tip.artist ?? {
                        id: tip.artistId!,
                      }
                    )}
                  >
                    {tip.artist.name}
                  </Link>{" "}
                  (id: {tip.artist.id})
                </td>
                <td>{tip.datePurchased}</td>
                <td>
                  <Money
                    amount={tip.pricePaid / 100}
                    currency={tip.currencyPaid}
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

export default AdminTips;
