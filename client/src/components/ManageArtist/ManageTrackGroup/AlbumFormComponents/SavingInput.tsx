import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";

import api from "services/api";

import LoadingSpinner from "components/common/LoadingSpinner";
import { css } from "@emotion/css";
import useErrorHandler from "services/useErrorHandler";
import { FaCheck } from "react-icons/fa";
import { useGetArtistColors } from "components/Artist/ArtistButtons";
import { multiply, set } from "lodash";
import { getCurrencySymbol } from "components/common/Money";
import TextEditor from "components/common/TextEditor";

const SavingInput: React.FC<{
  formKey: string;
  url: string;
  extraData?: Object;
  multiplyBy100?: boolean;
  id?: string;
  timer?: number;
  rows?: number;
  min?: number;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  step?: string | number;
  type?: string;
  currency?: string;
  onEnter?: () => void;
  saveOnBlur?: boolean;
  reload?: () => void;
  width?: string | number;
  valueTransform?: (value: unknown) => unknown;
  textEditor?: boolean;
  textEditorProps?: { disableFloatingToolbar?: boolean; basicStyles?: boolean };
}> = ({
  formKey,
  textEditor,
  textEditorProps,
  min,
  url,
  extraData = {},
  type,
  required,
  rows,
  currency,
  id,
  timer,
  step,
  maxLength,
  reload,
  width,
  onEnter,
  valueTransform,
  saveOnBlur,
  multiplyBy100,
}) => {
  const { colors } = useGetArtistColors();
  const { register, getValues } = useFormContext();
  const errorHandler = useErrorHandler();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const saveOnInput = async () => {
    try {
      setSaveSuccess(false);
      setIsSaving(true);
      let value = getValues(formKey);

      if (
        formKey === "releaseDate" ||
        formKey === "publishedAt" ||
        formKey === "fundraisingEndDate"
      ) {
        value = new Date(value).toISOString();
      } else if (formKey === "minPrice" || !!currency || multiplyBy100) {
        value = value ? value * 100 : undefined;
      }

      if (valueTransform) {
        value = valueTransform(value);
      }

      if (type === "number") {
        if (value === "") {
          value = null;
        } else {
          value = Number(value);
        }
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
  };

  const saveOnInputDebounced = useDebouncedCallback(() => {
    saveOnInput();
  }, timer ?? 2500);

  return (
    <div
      className={css`
        display: flex;
        width: ${width ?? "100%"};
        align-items: center;
        gap: 0.5rem;
        position: relative;
      `}
    >
      {currency && (
        <div
          className={css`
            margin-left: 0.5rem;
          `}
        >
          {getCurrencySymbol(currency)}
        </div>
      )}
      {!textEditor && (
        <>
          {!rows && (
            <InputEl
              colors={colors}
              {...register(formKey)}
              onInput={saveOnInputDebounced}
              // onChange={type === "checkbox" ? saveOnInput : undefined}
              type={type}
              required={required}
              step={step}
              min={min}
              id={id}
              {...(saveOnBlur && { onBlur: saveOnInput })}
              maxLength={maxLength}
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
              {...(saveOnBlur && { onBlur: saveOnInput })}
              onInput={saveOnInputDebounced}
            />
          )}
        </>
      )}
      {textEditor && (
        <Controller
          name={formKey}
          render={({ field: { onChange, value } }) => {
            return (
              <TextEditor
                onChange={(val: any) => {
                  onChange(val);
                  saveOnInputDebounced();
                }}
                value={value}
                {...(saveOnBlur && { onBlur: saveOnInput })}
                {...textEditorProps}
              />
            );
          }}
        />
      )}
      <div
        className={css`
          position: absolute;
          right: 0.5rem;
          top: 0.5rem;
          z-index: 99999;
          -webkit-filter: invert(100%);
          filter: invert(100%);
        `}
      >
        {isSaving && <LoadingSpinner fill={colors?.primary} size="small" />}
        {saveSuccess && <FaCheck fill={colors?.primary} />}
      </div>
    </div>
  );
};

export default SavingInput;
