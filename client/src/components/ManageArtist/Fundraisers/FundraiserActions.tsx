import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import { useChargeFundraiserPledgesMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

const FundraiserActions: React.FC<{
  fundraiser: Pick<
    Fundraiser,
    "id" | "isAllOrNothing" | "goalAmount" | "status"
  >;
  amountRaised: number;
}> = ({ fundraiser, amountRaised }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { ask } = useConfirm();
  const { mutateAsync: chargePledges, isPending: isCharging } =
    useChargeFundraiserPledgesMutation();

  const actionsRef = React.useRef<HTMLDivElement>(null);
  const focusAfterCharge = React.useRef(false);

  const isComplete = fundraiser.status === "SUCCESSFUL";
  const canCharge =
    !isComplete &&
    (!fundraiser.isAllOrNothing ||
      (amountRaised > 0 && fundraiser.goalAmount <= amountRaised));

  React.useEffect(() => {
    if (isComplete && focusAfterCharge.current) {
      focusAfterCharge.current = false;
      actionsRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    }
  }, [isComplete]);

  const onCharge = async () => {
    if (
      !(await ask(
        t(
          fundraiser.isAllOrNothing
            ? "confirmChargePledges"
            : "confirmMarkFundraiserDone"
        )
      ))
    ) {
      return;
    }
    try {
      focusAfterCharge.current = true;
      await chargePledges(fundraiser.id);
      snackbar(t("chargePledgesSuccess"), { type: "success" });
    } catch (e) {
      focusAfterCharge.current = false;
      errorHandler(e);
    }
  };

  return (
    <div ref={actionsRef} className="flex flex-wrap gap-2">
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
