import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import FundraiserProgressCircle from "components/common/FundraiserProgressCircle";
import { moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";

const ManageFundraisersList: React.FC<{
  artistId: number;
  fundraisers: FundraiserSummary[];
  currency?: string;
}> = ({ artistId, fundraisers, currency }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });

  if (fundraisers.length === 0) {
    return null;
  }

  return (
    <section className="mb-4" aria-labelledby="manage-fundraisers-heading">
      <h2 id="manage-fundraisers-heading" className="text-lg! mb-2!">
        {t("fundraisers")}
      </h2>
      <ul className="flex flex-col divide-y divide-(--mi-tint-x-color) border-y border-(--mi-tint-x-color)">
        {fundraisers.map((fundraiser) => (
          <li key={fundraiser.id} className="flex items-center gap-3 py-2">
            <FundraiserProgressCircle
              amountRaised={fundraiser.amountRaised}
              goalAmount={fundraiser.goalAmount}
            />
            <div className="flex min-w-0 grow flex-col">
              <span className="font-semibold">
                {fundraiser.name}
                {fundraiser.status === "SUCCESSFUL" && (
                  <span className="ml-2 text-sm font-normal text-(--mi-success-text-color)">
                    {t("funded")}
                  </span>
                )}
              </span>
              <span className="text-sm">
                {t("raisedOutOfGoal", {
                  raised: moneyDisplay({
                    amount: fundraiser.amountRaised / 100,
                    currency,
                  }),
                  goal: moneyDisplay({
                    amount: fundraiser.goalAmount / 100,
                    currency,
                  }),
                })}
              </span>
            </div>
            <ArtistButtonLink
              to={`/manage/artists/${artistId}/fundraisers/${fundraiser.id}`}
              size="compact"
              variant="outlined"
              rounded
              onlyIcon
              startIcon={<FaPen />}
              aria-label={t("editFundraiserName", { name: fundraiser.name })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ManageFundraisersList;
