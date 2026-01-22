import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  queryFundraiserPledges,
  queryManagedFundraiser,
} from "queries/trackGroups";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Table from "components/common/Table";
import { moneyDisplay } from "components/common/Money";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Select } from "components/common/Select";
import { getManageReleaseUrl, getReleaseUrl } from "utils/artist";

const FundraiserPledges: React.FC = () => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "fundraiserPledges",
  });
  const { fundraiserId } = useParams<{
    fundraiserId: string;
  }>();
  const [includeCancelled, setIncludeCancelled] = React.useState(false);

  const { data: fundraiser, isLoading: fundraiserLoading } = useQuery(
    queryManagedFundraiser(Number(fundraiserId))
  );

  const { data: pledgesData, isLoading } = useQuery(
    queryFundraiserPledges({
      fundraiserId: Number(fundraiserId),
      includeCancelled,
    })
  );

  if (isLoading || fundraiserLoading) {
    return <LoadingBlocks />;
  }

  const pledges = pledgesData?.results || [];
  const currency = fundraiser?.trackGroups?.[0]?.currency || "usd";
  const releaseTitle = fundraiser?.trackGroups?.[0]?.title || "Unknown Release";

  const totalAmount = pledges.reduce(
    (sum, pledge) => (pledge.cancelledAt ? sum : sum + pledge.amount),
    0
  );

  const totalPledgers = pledges.filter((p) => !p.cancelledAt).length;

  return (
    <div className="mt-6">
      <h1>{t("pledges")}</h1>
      <p>
        {t("fundraiserFor")} <strong>{releaseTitle}</strong>
        {fundraiser?.trackGroups?.[0].artist && (
          <>
            {" "}
            <Link
              to={getReleaseUrl(
                fundraiser?.trackGroups?.[0].artist,
                fundraiser?.trackGroups?.[0]
              )}
              className="text-blue-500 hover:underline"
            >
              {t("viewRelease")}
            </Link>
            {" | "}
            <Link
              to={getManageReleaseUrl(
                fundraiser?.trackGroups?.[0].artist,
                fundraiser?.trackGroups?.[0]
              )}
              className="text-blue-500 hover:underline"
            >
              {t("manageRelease")}
            </Link>
          </>
        )}
      </p>

      <div className="my-4">
        <div className="mb-4">
          <label htmlFor="pledgeFilter" className="block mb-2">
            {t("filterPledges")}
          </label>
          <Select
            value={includeCancelled ? "all" : "active"}
            onChange={(e) => setIncludeCancelled(e.target.value === "all")}
            options={[
              {
                label: t("activePledgesOnly"),
                value: "active",
              },
              {
                label: t("allPledges"),
                value: "all",
              },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm mb-2">{t("totalPledges")}</p>
            <p className="text-2xl font-bold">
              {moneyDisplay({ amount: totalAmount / 100, currency })}
            </p>
          </div>
          <div>
            <p className="text-sm mb-2">{t("activePledgers")}</p>
            <p className="text-2xl font-bold">{totalPledgers}</p>
          </div>
        </div>
      </div>

      {pledges.length === 0 ? (
        <p>{t("noPledges")}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("amount")}</th>
                <th>{t("createdAt")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((pledge: FundraiserPledge) => (
                <tr
                  key={pledge.id}
                  className={pledge.cancelledAt ? "opacity-60" : ""}
                >
                  <td>{pledge.user.name || pledge.user.email}</td>
                  <td>{pledge.user.email}</td>
                  <td>
                    {moneyDisplay({ amount: pledge.amount / 100, currency })}
                  </td>
                  <td>{formatDate({ date: pledge.createdAt, i18n })}</td>
                  <td>
                    {pledge.cancelledAt ? (
                      <span className="text-gray-400">{t("cancelled")}</span>
                    ) : pledge.paidAt ? (
                      <span className="text-blue-500">{t("paid")}</span>
                    ) : (
                      <span className="text-yellow-500">{t("pending")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default FundraiserPledges;
