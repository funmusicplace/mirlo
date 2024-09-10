import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
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
import { InputEl } from "components/common/Input";
import api from "services/api";

type OptionTypesForm = {
  optionTypes: Partial<MerchOptionType>[];
};

const OptionType: React.FC<{
  optionType: Partial<MerchOptionType>;
  index: number;
  isEditing: boolean;
}> = ({ optionType, isEditing, index }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });

  const methods = useFormContext();

  const { fields: options, append } = useFieldArray({
    control: methods.control,
    name: `optionTypes.${index}.options`,
  });
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
            <label>{t("optionName")}</label>
            <InputEl {...methods.register(`optionTypes.${index}.optionName`)} />
          </FormComponent>
          <FormComponent>
            <label>{t("options")}</label>
            {options.map((o, optionIndex) => (
              <InputEl
                {...methods.register(
                  `optionTypes.${index}.options.${optionIndex}.name`
                )}
              />
            ))}
            <Button
              onClick={() => {
                append("");
              }}
              type="button"
              compact
              startIcon={<FaPlus />}
              variant="dashed"
            >
              {t("addNewOption")}
            </Button>
          </FormComponent>
        </div>
      )}
      {!isEditing && (
        <>
          <em>{optionType.optionName}</em>
          {optionType.options?.map((o) => o.name)}
        </>
      )}
    </li>
  );
};

const MerchOptions: React.FC<{}> = () => {
  const { merchId: merchParamId } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const [isEditing, setIsEditing] = React.useState(false);

  const { data: merch, refetch } = useQuery(
    queryManagedMerch(merchParamId ?? "")
  );

  const methods = useForm<OptionTypesForm>({
    defaultValues: {
      optionTypes: merch?.optionTypes,
    },
  });
  const { fields, append } = useFieldArray({
    control: methods.control,
    name: `optionTypes`,
  });

  const update = React.useCallback(
    async (newOptionTypes: OptionTypesForm) => {
      const packet = newOptionTypes.optionTypes;
      try {
        await api.put(`manage/merch/${merchParamId}/optionTypes`, packet);
      } catch (e) {
        console.error("e", e);
      }
    },
    [merchParamId]
  );

  return (
    <>
      <h2
        className={css`
          margin-top: 3rem;
        `}
      >
        {t("merchOptionsTitle")}
      </h2>
      <p>{t("merchOptionsExplainer")}</p>
      <form
        onSubmit={methods.handleSubmit(update)}
        className={css`
          width: 100%;
        `}
      >
        <FormProvider {...methods}>
          <DashedList>
            {fields?.map((optionType, index) => (
              <OptionType
                optionType={optionType}
                key={optionType.id}
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
              {" "}
              <Button
                onClick={() => {
                  append({ optionName: "" });
                }}
                type="button"
                compact
                startIcon={<FaPlus />}
                variant="dashed"
              >
                {t("addNewMerchOption")}
              </Button>
              <Button>{t("save")}</Button>
            </>
          )}
        </div>
      </form>
    </>
  );
};

export default MerchOptions;
