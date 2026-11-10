import Button from "components/common/Button";
import EmailVerification from "components/common/EmailVerification";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { moneyDisplay } from "components/common/Money";
import PurchaseStep from "components/common/Purchase/PurchaseStep";
import { usePurchase } from "components/common/Purchase/usePurchase";
import TextArea from "components/common/TextArea";
import PaymentInputElement from "components/TrackGroup/PaymentInputElement";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

interface FormData {
  chosenPrice: string;
  message?: string;
  consentToStoreData: boolean;
}

const FundraiserPledgeForm: React.FC<{
  fundraiser: PublicFundraiser;
  platformPercent: number;
  returnUrl: string;
  onPledged: () => void;
}> = ({ fundraiser, platformPercent, returnUrl, onPledged }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const { checkout, startPurchase } = usePurchase();
  const [isStarting, setIsStarting] = React.useState(false);
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(null);
  const { artist, minPledge } = fundraiser;
  const currency = artist.user?.currency ?? "usd";

  const methods = useForm<FormData>({
    defaultValues: { chosenPrice: minPledge ? `${minPledge / 100}` : "" },
    reValidateMode: "onChange",
  });
  const chosenPrice = methods.watch("chosenPrice");
  const consentToStoreData = methods.watch("consentToStoreData");
  const amount = Number(chosenPrice);
  const lessThanMin = isFinite(amount) && amount < minPledge / 100;
  const isDisabled =
    !chosenPrice || !(amount > 0) || lessThanMin || !consentToStoreData;

  const pledge = async (data: FormData) => {
    try {
      setIsStarting(true);
      await startPurchase({
        artistId: artist.id,
        items: [
          {
            type: "fundraiserPledge",
            fundraiserId: fundraiser.id,
            price: String(Math.round(Number(data.chosenPrice) * 100)),
            message: data.message,
          },
        ],
        email: verifiedEmail ?? undefined,
      });
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <PurchaseStep
      checkout={checkout}
      returnUrl={returnUrl}
      onSuccess={onPledged}
      buttonLabel={t("completePayment")}
    >
      <FormProvider {...methods}>
        <p className="mb-4">{t("backThisProjectDescription")}</p>
        <form className="flex flex-col" onSubmit={methods.handleSubmit(pledge)}>
          <FormComponent>
            <PaymentInputElement
              currency={currency}
              platformPercent={platformPercent}
              minPrice={minPledge}
              basePrice={minPledge}
              artistName={artist.name}
              artistId={artist.id}
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor="pledge-message">{t("leaveAComment")}</label>
            <TextArea
              id="pledge-message"
              rows={2}
              {...methods.register("message")}
            />
          </FormComponent>
          {!user && (
            <EmailVerification
              setVerifiedEmail={setVerifiedEmail}
              contextSubject={`${fundraiser.name}: ${artist.name}`}
            />
          )}
          {(user || verifiedEmail) && (
            <>
              <FormComponent direction="row">
                <InputEl
                  type="checkbox"
                  id="consentToStoreData"
                  {...methods.register("consentToStoreData")}
                />
                <label htmlFor="consentToStoreData">
                  {t("consentToStoreData")}
                </label>
              </FormComponent>
              <Button
                size="big"
                rounded
                type="submit"
                endIcon={<FaArrowRight />}
                className="self-end"
                isLoading={isStarting}
                disabled={isDisabled}
              >
                {t("addPaymentInformation")}
              </Button>
            </>
          )}
          {lessThanMin && (
            <strong className="mt-2">
              {t("lessThanMin", {
                minPrice: moneyDisplay({ amount: minPledge / 100, currency }),
                artistName: artist.name,
              })}
            </strong>
          )}
        </form>
      </FormProvider>
    </PurchaseStep>
  );
};

export default FundraiserPledgeForm;
