import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { getCurrencySymbol, moneyDisplay } from "components/common/Money";
import TextEditor from "components/common/TextEditor";
import React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FundraiserFormData } from "utils/fundraiserFormData";
import { estimateStripeFee } from "utils/stripeFees";

const MoneyInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { currency?: string }
>(({ currency, ...props }, ref) => (
  <div className="flex items-center gap-2">
    {currency && <span className="ml-1">{getCurrencySymbol(currency)}</span>}
    <InputEl type="number" step="0.01" min={0} {...props} ref={ref} />
  </div>
));

const FundraiserFormFields: React.FC<{
  artistId: number;
  currency?: string;
  hasPledges: boolean;
  focusGoal?: boolean;
  platformPercent?: number;
  nameHint?: React.ReactNode;
}> = ({
  artistId,
  currency,
  hasPledges,
  focusGoal,
  platformPercent,
  nameHint,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { t: tFees } = useTranslation("translation", {
    keyPrefix: "artistSupporters",
  });
  const { register, control } = useFormContext<FundraiserFormData>();
  const goal = Number(useWatch({ control, name: "goalAmount" }));
  const platformFee = (goal * (platformPercent ?? 0)) / 100;
  const stripeFee = estimateStripeFee(goal);

  const goalRef = React.useRef<HTMLInputElement | null>(null);
  const { ref: goalRegisterRef, ...goalRegisterRest } = register("goalAmount", {
    min: 0,
  });

  React.useEffect(() => {
    if (focusGoal) {
      goalRef.current?.focus();
    }
  }, [focusGoal]);

  return (
    <>
      <FormComponent>
        <label htmlFor="input-fundraiser-name">{t("fundraiserName")}</label>
        <InputEl
          id="input-fundraiser-name"
          aria-describedby="description-fundraiser-name"
          {...register("fundraiserName")}
        />
        <span className="text-sm" id="description-fundraiser-name">
          {t("fundraiserNameDescription")}
        </span>
        {nameHint}
      </FormComponent>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        <FormComponent>
          <label htmlFor="input-goal-amount">{t("goal")}</label>
          <MoneyInput
            currency={currency}
            aria-describedby="description-goal-amount"
            id="input-goal-amount"
            {...goalRegisterRest}
            ref={(el: HTMLInputElement | null) => {
              goalRegisterRef(el);
              goalRef.current = el;
            }}
          />
          <span className="text-sm" id="description-goal-amount">
            {t("fundraisingGoalDescription")}
          </span>
          {platformPercent !== undefined && goal > 0 && (
            <div className="text-xs">
              <div>
                {tFees("lessPlatformFee", {
                  amount: moneyDisplay({ amount: platformFee, currency }),
                })}
              </div>
              <div>
                {tFees("lessStripeFeeEstimated", {
                  amount: moneyDisplay({ amount: stripeFee, currency }),
                })}
              </div>
              <div className="font-semibold">
                {tFees("netMonthly", {
                  amount: moneyDisplay({
                    amount: goal - platformFee - stripeFee,
                    currency,
                  }),
                })}
              </div>
            </div>
          )}
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-fundraiser-end-date">{t("endDate")}</label>
          <InputEl
            id="input-fundraiser-end-date"
            type="date"
            aria-describedby="description-fundraiser-end-date"
            {...register("fundraiserEndDate")}
          />
          <span className="text-sm" id="description-fundraiser-end-date">
            {t("endDateDescription")}
          </span>
        </FormComponent>
      </div>
      <FormComponent>
        <label id="label-fundraiser-description">
          {t("fundraiserDescription")}
        </label>
        <Controller
          name="fundraiserDescription"
          control={control}
          render={({ field: { onChange, value } }) => (
            <TextEditor
              labelledBy="label-fundraiser-description"
              describedBy="description-fundraiser-description"
              value={value ?? ""}
              onChange={onChange}
              artistId={artistId}
              allowMentions={false}
              disableFloatingToolbar
            />
          )}
        />
        <span className="text-sm" id="description-fundraiser-description">
          {t("fundraiserDescriptionDescription")}
        </span>
      </FormComponent>
      <FormComponent direction="row">
        <div>
          <InputEl
            aria-describedby="description-all-or-nothing"
            id="isAllOrNothing"
            type="checkbox"
            {...register("isAllOrNothing", { disabled: hasPledges })}
          />
        </div>
        <div className="flex flex-col pl-2">
          <label htmlFor="isAllOrNothing">{t("isAllOrNothing")}</label>
          <small id="description-all-or-nothing">
            {t("isAllOrNothingDescription")}
            {hasPledges && <> {t("isAllOrNothingLockedWithPledges")}</>}
          </small>
        </div>
      </FormComponent>
    </>
  );
};

export default FundraiserFormFields;
