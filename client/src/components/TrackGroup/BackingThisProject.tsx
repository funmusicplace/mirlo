import Button from "components/common/Button";
import Confetti from "components/common/Confetti";
import FormComponent from "components/common/FormComponent";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import Tooltip from "components/common/Tooltip";
import { useDeletePledgeMutation, useUpdatePledgeMutation } from "queries";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

import PaymentInputElement from "./PaymentInputElement";

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
  fundraiser: { id: number; minPledge?: number };
  platformPercent: number;
  artistName?: string;
}> = ({
  amount,
  collapse,
  currency,
  fundraiser,
  platformPercent,
  artistName,
}) => {
  const [isChangingPledge, setIsChangingPledge] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const minPrice = fundraiser.minPledge;
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

  const onUpdatePledge = async (data: FormData) => {
    const newPledgeAmount = Number(data.chosenPrice) * 100;
    if (isFinite(newPledgeAmount) && newPledgeAmount > 0) {
      setIsSavingPledge(true);

      try {
        await updatePledge({
          fundraiserId: fundraiser.id,
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
      await deletePledge({ fundraiserId: fundraiser.id });
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
                currency={currency}
                platformPercent={platformPercent}
                minPrice={minPrice}
                artistName={artistName}
              />
            </FormComponent>
            <div className="flex justify-between">
              <Button
                type="submit"
                size="big"
                isLoading={isSavingPledge}
                disabled={Number(chosenPrice) < (minPrice ?? 0) / 100}
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
          className="ml-2 flex items-center [&_svg]:-mt-2 [&_svg]:w-10"
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
