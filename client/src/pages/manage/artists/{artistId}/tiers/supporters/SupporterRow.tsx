import Money from "components/common/Money";
import Pill from "components/common/Pill";
import CancelSupporterButton from "components/ManageArtist/CancelSupporterButton";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";

import {
  isFreeSubscription,
  joinedInPastMonth,
  SupportTier,
} from "./supporters";

const SupporterRow: React.FC<{
  supporter: SupportTier;
  artistId?: number;
  currency: string;
}> = ({ supporter: r, artistId, currency }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "artistSupporters",
  });
  const isNew = joinedInPastMonth(r);

  return (
    <tr
      className={
        isNew
          ? "bg-[color-mix(in_srgb,var(--mi-instance-button-color,var(--mi-pink))_10%,transparent)]!"
          : undefined
      }
      title={isNew ? t("joinedInPastMonth") : undefined}
    >
      <td>{r.shippingAddress?.name ?? "-"}</td>
      <td>{r.user.email}</td>
      <td>
        {r.artistSubscriptionTier.name}
        {isFreeSubscription(r) && <Pill className="ml-2">{t("free")}</Pill>}
        {r.deleteReason && (
          <Pill
            variant="warning"
            title={t("cancellingExplanation")}
            className="ml-2"
          >
            {t("cancelling")}
          </Pill>
        )}
      </td>
      <td>
        {r.artistSubscriptionTier.interval === "MONTH"
          ? t("monthly")
          : t("yearly")}
        {r.nextBillingDate ? (
          <>
            {isNew && (
              <Pill title={t("newExplanation")} className="ml-2">
                {t("new")}
              </Pill>
            )}
            <br />
            <small>({formatDate({ date: r.nextBillingDate, i18n })}) </small>
          </>
        ) : (
          ""
        )}
      </td>
      <td>
        <Money amount={r.amount / 100} currency={currency} />
      </td>
      <td>
        {artistId && !r.deleteReason && (
          <CancelSupporterButton
            artistId={artistId}
            subscriptionId={r.id}
            supporterName={r.shippingAddress?.name ?? r.user.email}
          />
        )}
      </td>
    </tr>
  );
};

export default SupporterRow;
