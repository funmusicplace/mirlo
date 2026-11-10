import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { getCurrencySymbol } from "components/common/Money";
import TextArea from "components/common/TextArea";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FundraiserFormData } from "./fundraiserFormData";

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
  currency?: string;
  isAllOrNothing: boolean;
  hasPledges: boolean;
  focusGoal?: boolean;
}> = ({ currency, isAllOrNothing, hasPledges, focusGoal }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { register } = useFormContext<FundraiserFormData>();

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
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
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
        </FormComponent>
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
        </FormComponent>
        {isAllOrNothing && (
          <FormComponent>
            <label htmlFor="input-min-pledge">{t("minPledge")}</label>
            <MoneyInput
              currency={currency}
              aria-describedby="description-min-pledge"
              id="input-min-pledge"
              {...register("fundraiserMinPledge", { min: 0 })}
            />
            <span className="text-sm" id="description-min-pledge">
              {t("minPledgeDescription")}
            </span>
          </FormComponent>
        )}
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
        <label htmlFor="input-fundraiser-description">
          {t("fundraiserDescription")}
        </label>
        <TextArea
          id="input-fundraiser-description"
          rows={3}
          aria-describedby="description-fundraiser-description"
          {...register("fundraiserDescription")}
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
            disabled={hasPledges}
            {...register("isAllOrNothing")}
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
