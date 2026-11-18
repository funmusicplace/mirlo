import { moneyDisplay } from "components/common/Money";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { RankingColumn } from "./RankingTable";

export const adminArtistPath = (id: number) => `/admin/content/artists/${id}`;

export const artistColumn = <T extends { id: number; name: string }>(
  header: string
): RankingColumn<T> => ({
  header,
  cell: (row) => <Link to={adminArtistPath(row.id)}>{row.name}</Link>,
});

export const userColumn = <
  T extends { id: number; name: string | null; email: string },
>(
  header: string
): RankingColumn<T> => ({
  header,
  cell: (row) => (
    <Link to={`/admin/content/users/${row.id}`}>{row.name || row.email}</Link>
  ),
});

export const countColumn = <K extends string>(
  header: string,
  field: K
): RankingColumn<Record<K, number>> => ({
  header,
  numeric: true,
  cell: (row) => row[field].toLocaleString(),
});

export const moneyColumn = <K extends string>(
  header: string,
  field: K,
  currency = ""
): RankingColumn<Record<K, number>> => ({
  header,
  numeric: true,
  cell: (row) => moneyDisplay({ amount: row[field] / 100, currency }),
});

export const byId = (row: { id: number }) => row.id;

export const useDashboardT = () =>
  useTranslation("translation", { keyPrefix: "adminDashboard" }).t;
