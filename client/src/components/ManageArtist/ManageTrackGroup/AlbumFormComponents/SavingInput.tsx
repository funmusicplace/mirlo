import React from "react";
import { useFormContext } from "react-hook-form";

import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";

import api from "services/api";

import LoadingSpinner from "components/common/LoadingSpinner";
import { css } from "@emotion/css";
import useErrorHandler from "services/useErrorHandler";
import { FaCheck } from "react-icons/fa";
import { debounce } from "lodash";

const SavingInput: React.FC<{
  formKey: string;
  url: string;
  extraData?: Object;
  id?: string;
  timer?: number;
  rows?: number;
  min?: number;
  required?: boolean;
  step?: string;
  type?: string;
  reload?: () => void;
}> = ({
  formKey,
  min,
  url,
  extraData = {},
  type,
  required,
  rows,
  id,
  timer,
  step,
  reload,
}) => {
  const { register, getValues } = useFormContext();
  const errorHandler = useErrorHandler();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const saveOnInput = React.useCallback(
    debounce(async () => {
      try {
        setSaveSuccess(false);
        setIsSaving(true);
        let value = getValues(formKey);

        if (formKey === "releaseDate" || formKey === "publishedAt") {
          value = new Date(value).toISOString();
        } else if (formKey === "minPrice") {
          value = value ? value * 100 : undefined;
        }

        if (type === "number") {
          value = Number(value);
        }

        const data = {
          [formKey]: value,
          ...extraData,
        };

        await api.put<unknown, unknown>(url, data);

        let timeout2: NodeJS.Timeout;
        const timeout = setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(true);
          reload?.();
          timeout2 = setTimeout(() => {
            setSaveSuccess(false);
          }, 1000);
        }, 1000);
        return () => {
          clearTimeout(timeout2);
          clearTimeout(timeout);
        };
      } catch (e) {
        errorHandler(e);
        setIsSaving(false);
      }
    }, timer ?? 1500),
    [formKey, timer, getValues, url, extraData]
  );

  return (
    <div
      className={css`
        display: flex;
        width: 100%;
        align-items: center;
      `}
    >
      {!rows && (
        <InputEl
          {...register(formKey)}
          onInput={saveOnInput}
          type={type}
          required={required}
          step={step}
          min={min}
          id={id}
        />
      )}
      {rows && (
        <TextArea {...register(formKey)} rows={rows} onInput={saveOnInput} />
      )}
      {isSaving && <LoadingSpinner />}
      {saveSuccess && <FaCheck />}
    </div>
  );
};

export default SavingInput;
