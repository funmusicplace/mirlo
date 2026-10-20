import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import InstanceLogoImage from "components/common/InstanceLogoImage";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTrash, FaUpload } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { formatAcceptList } from "utils/uploadFormats";

import { FormSettings, LOGO_FIELDS, LogoKind } from "./settingsForm";
import { useDisplayedLogo } from "./useDisplayedLogo";

const MAX_LOGO_BYTES = 200 * 1024;
const LOGO_ACCEPT = ".svg,.png";
const LOGO_SIZE_LABEL = `${MAX_LOGO_BYTES / 1024} KB`;

const InstanceLogoField: React.FC<{
  kind: LogoKind;
  tint?: boolean;
  buttonColor?: string;
}> = ({ kind, tint, buttonColor }) => {
  const field = LOGO_FIELDS[kind];
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { setValue } = useFormContext<FormSettings>();
  const { logo, isPending, hasLogo } = useDisplayedLogo(kind);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const actionsRef = React.useRef<HTMLDivElement | null>(null);
  const labelId = `label-${field.id}`;
  const hintId = `hint-${field.id}`;

  const setPendingLogo = (value: File | null) => {
    setValue(field.name, value, { shouldDirty: true });
    actionsRef.current?.querySelector("button")?.focus();
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      snackbar(t("instanceLogoTooLarge", { maxSize: LOGO_SIZE_LABEL }), {
        type: "warning",
      });
      return;
    }
    setPendingLogo(file);
  };

  return (
    <FormComponent role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={`input-${field.id}`}>
        {t(field.labelKey)}
      </label>
      {logo && (
        <figure
          className="m-0 flex h-16 items-center self-start border border-(--mi-tint-x-color) bg-(--mi-background-color) p-3"
          style={
            buttonColor
              ? ({ "--mi-button-color": buttonColor } as React.CSSProperties)
              : undefined
          }
        >
          <InstanceLogoImage
            logo={logo}
            tint={tint}
            className="h-10 w-auto max-w-[240px]"
            onError={() =>
              snackbar(t("instanceLogoUnreadable"), { type: "warning" })
            }
          />
          <figcaption className="sr-only">
            {t(isPending ? field.pendingCaptionKey : field.savedCaptionKey)}
          </figcaption>
        </figure>
      )}
      <input
        ref={inputRef}
        id={`input-${field.id}`}
        type="file"
        accept={LOGO_ACCEPT}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onFileChange}
      />
      <div ref={actionsRef} className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          startIcon={<FaUpload />}
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
        >
          {hasLogo ? t(field.replaceKey) : t(field.uploadKey)}
        </Button>
        {hasLogo && field.removeKey && (
          <Button
            type="button"
            variant="outlined"
            startIcon={<FaTrash />}
            onClick={() => setPendingLogo(null)}
          >
            {t(field.removeKey)}
          </Button>
        )}
      </div>
      <small id={hintId}>
        {t(field.hintKey, {
          formats: formatAcceptList(LOGO_ACCEPT),
          maxSize: LOGO_SIZE_LABEL,
        })}
      </small>
    </FormComponent>
  );
};

export default InstanceLogoField;
