import { css } from "@emotion/css";
import Money from "components/common/Money";
import Pill from "components/common/Pill";
import Table from "components/common/Table";
import React from "react";
import { useSearchParams } from "react-router-dom";
import usePagination from "utils/usePagination";

import {
  useFundraiserPledgesQuery,
  type FundraiserPledgesFilters,
} from "../../queries/admin";

import useAdminFilters from "./useAdminFilters";

const pageSize = 50;

export default function AdminFundraiserPledges() {
  const [searchParams] = useSearchParams();
  const { page, PaginationComponent } = usePagination({ pageSize });

  const { Filters } = useAdminFilters({
    onSubmitFilters: () => Promise.resolve(),
    fields: ["search", "pledgeStatus"],
  });

  // Convert searchParams to filters for the API
  const filters: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    if (value) {
      filters[key] = isNaN(Number(value)) ? value : Number(value);
    }
  });

  const { data: pledgesData, isLoading: pledgesLoading } =
    useFundraiserPledgesQuery(
      filters as FundraiserPledgesFilters,
      page,
      pageSize
    );

  const pledges = pledgesData?.results || [];
  const total = pledgesData?.total || 0;

  return (
    <div
      className={css`
        flex-grow: 1;
      `}
    >
      <Filters />

      <h4>Total Pledges: {total}</h4>

      {pledgesLoading ? (
        <p>Loading pledges...</p>
      ) : pledges.length === 0 ? (
        <p>No pledges found.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Pledger</th>
              <th>Artist</th>
              <th>Fundraiser</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {pledges.map((pledge: any) => (
              <tr key={pledge.id}>
                <td>{pledge.id}</td>
                <td>{pledge.user?.name || pledge.user?.email || "—"}</td>
                <td>
                  {pledge.fundraiser?.trackGroups?.[0]?.artist?.name || "—"}
                </td>
                <td>{pledge.fundraiser?.name || "—"}</td>
                <td>
                  <Money
                    amount={pledge.amount / 100}
                    currency={pledge.currency ?? "usd"}
                  />
                </td>
                <td>
                  {pledge.paidAt ? (
                    <Pill>Paid</Pill>
                  ) : pledge.cancelledAt ? (
                    <Pill>Cancelled</Pill>
                  ) : (
                    <Pill>Pending</Pill>
                  )}
                </td>
                <td>{new Date(pledge.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div
        className={css`
          margin-top: 2rem;
        `}
      >
        <PaginationComponent />
      </div>
    </div>
  );
}
