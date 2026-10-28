import InstanceLogoImage from "components/common/InstanceLogoImage";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import { formatAcceptList } from "utils/uploadFormats";

import InstanceImageField from "./InstanceImageField";
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

  return (
    <InstanceImageField
      id={field.id}
      label={t(field.labelKey)}
      hint={t(field.hintKey, {
        formats: formatAcceptList(LOGO_ACCEPT),
        maxSize: LOGO_SIZE_LABEL,
      })}
      accept={LOGO_ACCEPT}
      maxBytes={MAX_LOGO_BYTES}
      tooLargeMessage={t("instanceLogoTooLarge", { maxSize: LOGO_SIZE_LABEL })}
      hasImage={hasLogo}
      uploadLabel={t(field.uploadKey)}
      replaceLabel={t(field.replaceKey)}
      removeLabel={field.removeKey && t(field.removeKey)}
      onChange={(file) => setValue(field.name, file, { shouldDirty: true })}
      preview={
        logo && (
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
        )
      }
    />
  );
};

export default InstanceLogoField;
