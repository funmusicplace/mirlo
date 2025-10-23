import { css } from "@emotion/css";
import Money from "components/common/Money";
import Table from "components/common/Table";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "services/api";
import { getReleaseUrl } from "utils/artist";
import useAdminFilters from "./useAdminFilters";
import usePagination from "utils/usePagination";
import TextArea from "components/common/TextArea";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";

const pageSize = 100;

export const AdminPurchases: React.FC = () => {
  const [results, setResults] = React.useState<UserTransaction[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [purchasers, setPurchasers] = React.useState("");
  const [trackGroupId, setTrackGroupId] = React.useState("");
  const [pricePaid, setPricePaid] = React.useState("");
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

  const createPurchases = async (users: { email: string }[]) => {
    try {
      await api.post(`admin/purchases`, {
        users,
        trackGroupId: Number(trackGroupId),
        pricePaid: Number(pricePaid),
      });
      setPurchasers("");
      setTrackGroupId("");
      setPricePaid("");
      callback();
    } catch (e) {}
  };

  const processTextArea = React.useCallback(() => {
    const emailsAsList =
      purchasers
        ?.split(/,|\r?\n/)
        .map((email) => email.replaceAll(" ", ""))
        .filter((email) => !!email) ?? [];
    const users = emailsAsList?.map((email) => ({ email }));
    createPurchases(users);
  }, [purchasers, createPurchases]);

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <h3>Purchases</h3>
      <div>
        <FormComponent>
          <label>User emails</label>
          <TextArea
            onChange={(e) => setPurchasers(e.target.value)}
            value={purchasers}
          />
        </FormComponent>
        <FormComponent>
          <label>Trackgroup ID</label>
          <InputEl
            onChange={(e) => setTrackGroupId(e.target.value)}
            value={trackGroupId}
            type="number"
          />
        </FormComponent>
        <FormComponent>
          <label>Price paid in cents</label>
          <InputEl
            onChange={(e) => setPricePaid(e.target.value)}
            value={pricePaid}
            type="number"
          />
        </FormComponent>
        <Button type="button" onClick={processTextArea}>
          Bulk add purchase to users
        </Button>
      </div>
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

export default AdminPurchases;
