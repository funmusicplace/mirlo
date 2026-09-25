import { moneyDisplay } from "components/common/Money";
import Select from "components/common/Select";
import Table from "components/common/Table";
import { TopAccountsPeriod, useAdminTopAccountsQuery } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type Row = {
  id: number;
  label: string;
  to: string;
  usdCents: number;
  transactionCount: number;
};

const usd = (cents: number) =>
  moneyDisplay({ amount: cents / 100, currency: "usd" });

const RankingTable: React.FC<{
  title: string;
  nameHeader: string;
  rows: Row[];
}> = ({ title, nameHeader, rows }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  return (
    <div className="p-4 rounded-md border border-(--mi-tint-x-color) bg-(--mi-background-color)">
      <h4 className="mb-4 font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p>{t("noSalesInPeriod")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>#</th>
              <th>{nameHeader}</th>
              <th className="text-right">{t("transactions")}</th>
              <th className="text-right">{t("usd")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>
                  <Link to={row.to}>{row.label}</Link>
                </td>
                <td className="text-right">
                  {row.transactionCount.toLocaleString()}
                </td>
                <td className="text-right">{usd(row.usdCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

const TopAccountsTables: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [period, setPeriod] = React.useState<TopAccountsPeriod>("month");
  const { data, error } = useAdminTopAccountsQuery(period);

  return (
    <section className="mb-8">
      <label className="mb-4 flex items-center gap-2">
        {t("topAccountsOverThePast")}
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as TopAccountsPeriod)}
          options={[
            { label: t("month"), value: "month" },
            { label: t("year"), value: "year" },
          ]}
        />
      </label>

      {error && <div>{t("error", { message: error.message })}</div>}
      {!data && !error && <div>{t("loadingTopAccounts")}</div>}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <RankingTable
            title={t("topSellers")}
            nameHeader={t("artist")}
            rows={data.sellers.map((seller) => ({
              id: seller.id,
              label: seller.name,
              to: `/admin/content/artists/${seller.id}`,
              usdCents: seller.usdCents,
              transactionCount: seller.transactionCount,
            }))}
          />
          <RankingTable
            title={t("topPurchasers")}
            nameHeader={t("user")}
            rows={data.purchasers.map((purchaser) => ({
              id: purchaser.id,
              label: purchaser.name || purchaser.email,
              to: `/admin/content/users/${purchaser.id}`,
              usdCents: purchaser.usdCents,
              transactionCount: purchaser.transactionCount,
            }))}
          />
        </div>
      )}
    </section>
  );
};

export default TopAccountsTables;
