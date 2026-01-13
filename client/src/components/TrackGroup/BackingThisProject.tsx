import { css } from "@emotion/css";
import Confetti from "components/common/Confetti";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import Tooltip from "components/common/Tooltip";
import React from "react";
import { useTranslation } from "react-i18next";
import PaymentInputElement from "./PaymentInputElement";
import { FormProvider, useForm } from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import Button from "components/common/Button";
import { useSnackbar } from "state/SnackbarContext";
import { useDeletePledgeMutation, useUpdatePledgeMutation } from "queries";
import { useConfirm } from "utils/useConfirm";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
  consentToStoreData: boolean;
}

const BackingThisProject: React.FC<{
  amount: number;
  currency: string;
  collapse?: boolean;
  trackGroup: TrackGroup;
}> = ({ amount, collapse, currency, trackGroup }) => {
  const [isChangingPledge, setIsChangingPledge] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const minPrice = trackGroup?.minPrice;
  const snackbar = useSnackbar();
  const { mutateAsync: updatePledge } = useUpdatePledgeMutation();
  const { mutateAsync: deletePledge } = useDeletePledgeMutation();
  const { ask } = useConfirm();

  const [isSavingPledge, setIsSavingPledge] = React.useState(false);

  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${amount ? amount / 100 : minPrice ? minPrice / 100 : ""}`,
    },
    reValidateMode: "onChange",
  });

  const { setValue } = methods;

  if (!trackGroup) {
    return null;
  }

  const onUpdatePledge = async (data: FormData) => {
    const newPledgeAmount = Number(data.chosenPrice) * 100;
    if (isFinite(newPledgeAmount) && newPledgeAmount > 0) {
      setIsSavingPledge(true);

      try {
        if (!trackGroup.fundraiserId) {
          console.error("No fundraiser associated with this track group");
          return;
        }
        await updatePledge({
          fundraiserId: trackGroup.fundraiserId,
          amount: newPledgeAmount,
        });
        setIsChangingPledge(false);
        setValue("chosenPrice", data.chosenPrice);
        snackbar(t("pledgeUpdatedSuccessfully"), { type: "success" });
      } catch (e) {
        console.error("Error updating pledge:", e);
      } finally {
        setIsSavingPledge(false);
      }
    }
  };

  const onClickStopBacking = async () => {
    setIsChangingPledge(false);
    const response = await ask(t("areYouSureYouWantToStopBacking"));
    if (!response) {
      return;
    }
    try {
      if (!trackGroup.fundraiserId) {
        console.error("No fundraiser associated with this track group");
        return;
      }
      await deletePledge({ fundraiserId: trackGroup.fundraiserId });
      setIsChangingPledge(false);
      snackbar(t("pledgeDeletedSuccessfully"), { type: "success" });
    } catch (e) {
      console.error("Error deleting pledge:", e);
    }
  };

  const chosenPrice = methods.watch("chosenPrice");

  return (
    <>
      <Modal
        open={isChangingPledge}
        onClose={() => setIsChangingPledge(false)}
        size="small"
        title={t("changePledge")}
      >
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onUpdatePledge)}>
            <FormComponent>
              <PaymentInputElement
                currency={trackGroup.currency}
                platformPercent={trackGroup.platformPercent}
                minPrice={trackGroup.minPrice}
                artistName={trackGroup.artist?.name}
              />
            </FormComponent>
            <div className="flex justify-between">
              <Button
                type="submit"
                size="big"
                isLoading={isSavingPledge}
                disabled={
                  Number(chosenPrice) < (trackGroup.minPrice ?? 0) / 100
                }
              >
                {t("updatePledge")}
              </Button>
              <Button
                variant="transparent"
                type="button"
                onClick={onClickStopBacking}
              >
                {t("stopBacking")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </Modal>
      <Tooltip hoverText={t("youWillBeChargedWhenItsFullyFunded")}>
        <div
          className={css`
            margin-left: 0.5rem;
            display: flex;
            align-items: center;
            svg {
              width: 40px;
              margin-top: -0.5rem;
            }
          `}
          onClick={() => setIsChangingPledge(true)}
        >
          <Confetti />

          {!collapse && (
            <span>
              {t("backingThisProjectFor", {
                amount: moneyDisplay({ amount: amount / 100, currency }),
              })}
            </span>
          )}
        </div>
      </Tooltip>
    </>
  );
};

export default BackingThisProject;
