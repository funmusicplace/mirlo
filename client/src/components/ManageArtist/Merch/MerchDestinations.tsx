import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import Money, { moneyDisplay } from "components/common/Money";
import { queryManagedMerch } from "queries";
import { FaPen, FaPlus } from "react-icons/fa";
import { useParams } from "react-router-dom";
import DashedList from "./DashedList";
import { css } from "@emotion/css";
import React from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import { useTranslation } from "react-i18next";
import { SelectEl } from "components/common/Select";
import countryCodesCurrencies from "./country-codes-currencies";
import { InputEl } from "components/common/Input";
import api from "services/api";

type DestinationForm = {
  destinations: Partial<ShippingDestination>[];
};

const Destination: React.FC<{
  dest: Partial<ShippingDestination>;
  index: number;
  isEditing: boolean;
}> = ({ dest, isEditing, index }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });

  const methods = useFormContext();
  return (
    <li>
      {isEditing && (
        <div
          className={css`
            width: 100%;

            > div {
              max-width: 45%;
              display: inline-block;
              margin-right: 1rem;
            }
          `}
        >
          <FormComponent>
            <label>{t("destinationCountry")}</label>
            <SelectEl
              {...methods.register(`destinations.${index}.destinationCountry`)}
            >
              <option>Anywhere</option>
              {countryCodesCurrencies.map((country) => (
                <option key={country.countryCode} value={country.countryCode}>
                  {country.countryName} {country.countryCode}
                </option>
              ))}
            </SelectEl>
          </FormComponent>
          <FormComponent>
            <label>{t("costUnit")}</label>
            <InputEl
              type="number"
              {...methods.register(`destinations.${index}.costUnit`)}
            />
          </FormComponent>
          <FormComponent>
            <label>{t("costExtraUnit")}</label>
            <InputEl
              type="number"
              {...methods.register(`destinations.${index}.costExtraUnit`)}
            />
          </FormComponent>
        </div>
      )}
      {!isEditing && (
        <>
          <em>
            {dest.homeCountry} -&gt; {dest.destinationCountry || t("anywhere")}
          </em>
          {dest.currency && (
            <>
              {t("costPerUnitDisplay", {
                costUnit: moneyDisplay({
                  amount: dest.costUnit,
                  currency: dest.currency,
                }),
                costExtraUnit: moneyDisplay({
                  amount: dest.costExtraUnit,
                  currency: dest.currency,
                }),
              })}
            </>
          )}
        </>
      )}
    </li>
  );
};

const MerchDestinations: React.FC<{}> = () => {
  const { merchId: merchParamId } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const [isEditing, setIsEditing] = React.useState(false);

  const { data: merch, refetch } = useQuery(
    queryManagedMerch(merchParamId ?? "")
  );

  const methods = useForm<DestinationForm>({
    defaultValues: {
      destinations: merch?.shippingDestinations.map((dest) => ({
        ...dest,
        costUnit: dest.costUnit / 100,
        costExtraUnit: dest.costExtraUnit / 100,
      })),
    },
  });
  const { fields, append } = useFieldArray({
    control: methods.control,
    name: `destinations`,
  });

  const update = React.useCallback(
    async (newDestinations: DestinationForm) => {
      const packet = newDestinations.destinations.map((dest) => ({
        ...dest,
        costUnit: Number(dest.costUnit) * 100,
        costExtraUnit: Number(dest.costExtraUnit) * 100,
      }));
      try {
        await api.put(`manage/merch/${merchParamId}/destinations`, packet);
        refetch();
      } catch (e) {
        console.error("e", e);
      }
    },
    [merchParamId, refetch]
  );

  return (
    <>
      <h2
        className={css`
          margin-top: 3rem;
        `}
      >
        {t("shippingDestinationPrices")}
      </h2>
      <p>{t("setDifferentCostPerDestination")}</p>
      <form
        onSubmit={methods.handleSubmit(update)}
        className={css`
          width: 100%;
        `}
      >
        <FormProvider {...methods}>
          <DashedList>
            {fields?.map((dest, index) => (
              <Destination
                dest={dest}
                key={dest.id}
                isEditing={isEditing}
                index={index}
              />
            ))}
          </DashedList>
        </FormProvider>
        <div
          className={css`
            margin-top: 1rem;
          `}
        >
          {!isEditing && (
            <Button startIcon={<FaPen />} onClick={() => setIsEditing(true)}>
              {t("edit")}
            </Button>
          )}
          {isEditing && (
            <>
              <Button
                onClick={() => {
                  append({ destinationCountry: null });
                }}
                type="button"
                compact
                startIcon={<FaPlus />}
                variant="dashed"
              >
                {t("addNewShippingDestination")}
              </Button>
              <Button>{t("save")}</Button>
            </>
          )}
        </div>
      </form>
    </>
  );
};

export default MerchDestinations;
