import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import { querySubscriptionPayouts } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";

const SubscriptionPayoutsWarning: React.FC<{ artistId: number }> = ({
  artistId,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { data: payouts } = useQuery(querySubscriptionPayouts(artistId));

  if (!payouts?.onOtherAccounts) {
    return null;
  }

  return (
    <Box variant="warning">
      {t("subscriptionsPayOutElsewhere", {
        count: payouts.onOtherAccounts,
        total: payouts.paidSubscriptions,
      })}
    </Box>
  );
};

export default SubscriptionPayoutsWarning;
