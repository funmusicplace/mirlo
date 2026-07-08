import { css } from "@emotion/css";
import useAdminFilters from "components/Admin/useAdminFilters";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "services/api";
import { getReleaseUrl } from "utils/artist";
import usePagination from "utils/usePagination";

const pageSize = 100;

export const Index: React.FC = () => {
  const [results, setResults] = React.useState<UserTransaction[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [searchParams] = useSearchParams();

  const callback = React.useCallback(async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();
    params.append("orderBy", "datePurchased");
    params.append("skip", `${pageSize * page}`);
    params.append("take", `${pageSize}`);

    const { results } = await api.getMany<UserTransaction>(
      `admin/purchases?${params.toString() ?? ""}`
    );
    setResults(results);
  }, [page, searchParams]);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["datePurchased", "pricePaid"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  const total = results.reduce((aggr, r) => {
    const currencyPaid = r.currency.toLowerCase();
    if (aggr[currencyPaid]) {
      aggr[currencyPaid] += r.amount;
    } else {
      aggr[currencyPaid] = r.amount;
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
      <p className="mb-4">
        To add purchases for users, use the dollar-sign button on a release in
        the <Link to="/admin/track-groups">TrackGroups admin page</Link>.
      </p>
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
              <tr key={purchase.id}>
                <td>{index + 1}</td>

                <td>
                  {purchase.user.email} (userId: {purchase.userId})
                </td>
                <td>
                  {purchase.trackGroupPurchases?.map((tgp) => (
                    <>
                      <Link
                        to={getReleaseUrl(
                          tgp.trackGroup.artist ?? {
                            id: tgp.trackGroup.artistId!,
                          },
                          tgp.trackGroup
                        )}
                      >
                        {tgp.trackGroup.title}
                      </Link>{" "}
                      (id: {tgp.trackGroup.id})
                    </>
                  ))}
                </td>
                <td>{purchase.createdAt}</td>
                <td>
                  <Money
                    amount={purchase.amount / 100}
                    currency={purchase.currency.toLowerCase()}
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

export default Index;
