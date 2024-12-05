import React from "react";
import { useFormContext } from "react-hook-form";

import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";

import api from "services/api";

import LoadingSpinner from "components/common/LoadingSpinner";
import { css } from "@emotion/css";
import useErrorHandler from "services/useErrorHandler";
import { FaCheck } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { debounce } from "lodash";

const SavingInput: React.FC<{
  formKey: string;
  url: string;
  extraData?: Object;
  rows?: number;
  required?: boolean;
  step?: string;
  type?: string;
  clearQueryKey?: string;
}> = ({
  formKey,
  url,
  extraData = {},
  type,
  required,
  rows,
  step,
  clearQueryKey,
}) => {
  const { register, getValues } = useFormContext();
  const errorHandler = useErrorHandler();
  const client = useQueryClient();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const saveOnBlur = React.useCallback(
    debounce(async () => {
      try {
        setSaveSuccess(false);
        setIsSaving(true);
        let value = getValues(formKey);

        if (formKey === "releaseDate") {
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

        if (clearQueryKey) {
          client.invalidateQueries({
            predicate: (query) => {
              const shouldInvalidate = query.queryKey.find((obj) => {
                if (typeof obj === "string") {
                  return obj
                    .toLowerCase()
                    .includes(clearQueryKey.toLowerCase());
                }
                return false;
              });

              return !!shouldInvalidate;
            },
          });
        }
        let timeout2: NodeJS.Timeout;
        const timeout = setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(true);
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
    }, 500),
    [formKey, getValues, url, extraData]
  );

  return (
    <div
      className={css`
        display: flex;
        width: 100%;
        align-items: center;

        input,
        textarea {
          margin-right: 1rem;
        }
      `}
    >
      {!rows && (
        <InputEl
          {...register(formKey)}
          onInput={saveOnBlur}
          type={type}
          required={required}
          step={step}
        />
      )}
      {rows && (
        <TextArea {...register(formKey)} rows={rows} onInput={saveOnBlur} />
      )}
      {isSaving && <LoadingSpinner />}
      {saveSuccess && <FaCheck />}
    </div>
  );
};

export default SavingInput;
