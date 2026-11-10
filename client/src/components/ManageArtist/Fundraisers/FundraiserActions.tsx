import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import {
  useChargeFundraiserPledgesMutation,
  useDeleteFundraiserMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

const FundraiserActions: React.FC<{
  fundraiser: Pick<
    Fundraiser,
    "id" | "isAllOrNothing" | "goalAmount" | "status"
  >;
  amountRaised: number;
  pledgeCount: number;
  onChanged?: () => void;
  onRemoved?: () => void;
}> = ({ fundraiser, amountRaised, pledgeCount, onChanged, onRemoved }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { mutateAsync: chargePledges, isPending: isCharging } =
    useChargeFundraiserPledgesMutation();
  const { mutateAsync: deleteFundraiser, isPending: isDeleting } =
    useDeleteFundraiserMutation();

  const hasPledges = pledgeCount > 0;
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

  const onRemove = async () => {
    if (
      hasPledges &&
      !window.confirm(
        t("removingFundraiserWithPledgesWarning", { count: pledgeCount })
      )
    ) {
      return;
    }
    try {
      await deleteFundraiser(fundraiser.id);
      snackbar(t("fundraiserRemoved"), { type: "success" });
      onRemoved?.();
    } catch (e) {
      console.error(e);
      snackbar(t("removalFailed"), { type: "warning" });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {fundraiser.isAllOrNothing && (
        <ArtistButtonLink
          to={`/manage/fundraiser/${fundraiser.id}/pledges`}
          className="flex items-center gap-1"
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
      <ArtistButton
        type="button"
        onClick={onRemove}
        isLoading={isDeleting}
        startIcon={<FaTrash />}
      >
        {t(hasPledges ? "cancelFundraiser" : "removeFundraiser")}
      </ArtistButton>
    </div>
  );
};

export default FundraiserActions;
