import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import { useChargeFundraiserPledgesMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

const FundraiserActions: React.FC<{
  fundraiser: Pick<
    Fundraiser,
    "id" | "isAllOrNothing" | "goalAmount" | "status"
  >;
  amountRaised: number;
  onChanged?: () => void;
}> = ({ fundraiser, amountRaised, onChanged }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { mutateAsync: chargePledges, isPending: isCharging } =
    useChargeFundraiserPledgesMutation();

  const isComplete = fundraiser.status === "SUCCESSFUL";
  const canCharge =
    !isComplete &&
    (!fundraiser.isAllOrNothing ||
      (amountRaised > 0 && fundraiser.goalAmount <= amountRaised));

  const onCharge = async () => {
    try {
      await chargePledges(fundraiser.id);
      snackbar(t("chargePledgesSuccess"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    } finally {
      onChanged?.();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {fundraiser.isAllOrNothing && (
        <ArtistButtonLink
          to={`/manage/fundraiser/${fundraiser.id}/pledges`}
          className="flex items-center gap-1"
          variant="dashed"
        >
          {t("viewPledges")}
        </ArtistButtonLink>
      )}
      {canCharge && (
        <ArtistButton
          type="button"
          onClick={onCharge}
          isLoading={isCharging}
          disabled={isCharging}
        >
          {t(
            fundraiser.isAllOrNothing ? "chargePledges" : "markFundraiserDone"
          )}
        </ArtistButton>
      )}
    </div>
  );
};

export default FundraiserActions;
