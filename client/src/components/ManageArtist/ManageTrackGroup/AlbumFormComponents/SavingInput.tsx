import React from "react";
import { useFormContext } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";

import api from "services/api";

import LoadingSpinner from "components/common/LoadingSpinner";
import { css } from "@emotion/css";
import useErrorHandler from "services/useErrorHandler";
import { FaCheck } from "react-icons/fa";
import { useGetArtistColors } from "components/Artist/ArtistButtons";
import { set } from "lodash";

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
  onEnter?: () => void;
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
  onEnter,
}) => {
  const { colors } = useGetArtistColors();
  const { register, getValues } = useFormContext();
  const errorHandler = useErrorHandler();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const saveOnInput = useDebouncedCallback(async () => {
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
      let data = {};

      if (formKey.includes(".")) {
        set(data, formKey, value);
      } else {
        data = {
          [formKey]: value,
          ...extraData,
        };
      }

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
  }, timer ?? 2500);

  return (
    <div
      className={css`
        display: flex;
        width: 100%;
        align-items: center;
        gap: 0.5rem;
      `}
    >
      {!rows && (
        <InputEl
          colors={colors}
          {...register(formKey)}
          onInput={saveOnInput}
          // onChange={type === "checkbox" ? saveOnInput : undefined}
          type={type}
          required={required}
          step={step}
          min={min}
          id={id}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              onEnter?.();
            }
          }}
        />
      )}
      {rows && (
        <TextArea
          {...register(formKey)}
          rows={rows}
          colors={colors}
          onInput={saveOnInput}
        />
      )}
      {isSaving && <LoadingSpinner fill={colors?.foreground} />}
      {saveSuccess && <FaCheck />}
    </div>
  );
};

export default SavingInput;
