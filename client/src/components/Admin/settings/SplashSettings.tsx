import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import TextArea from "components/common/TextArea";
import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useUpload } from "state/UploadContext";
import { formatAcceptList } from "utils/uploadFormats";
import useObjectUrl from "utils/useObjectUrl";

import InstanceImageField from "./InstanceImageField";
import { FormSettings, SPLASH_IMAGE_JOB_KEY } from "./settingsForm";

const MAX_SPLASH_IMAGE_BYTES = 20 * 1024 * 1024;
const SPLASH_IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const SPLASH_IMAGE_SIZE_LABEL = `${MAX_SPLASH_IMAGE_BYTES / 1024 / 1024} MB`;
const MAX_SPLASH_TITLE_LENGTH = 200;
const MAX_SPLASH_SUBTITLE_LENGTH = 1000;
const SPLASH_TEXT_POSITIONS = [
  { value: "left", labelKey: "splashTextPositionLeft" },
  { value: "center", labelKey: "splashTextPositionCenter" },
  { value: "right", labelKey: "splashTextPositionRight" },
] as const;

const SplashImageField: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { setValue, watch } = useFormContext<FormSettings>();
  const savedImage = useInstanceSettings().splashImage;
  const job = useUpload().trackedImageJobs.find(
    ({ key }) => key === SPLASH_IMAGE_JOB_KEY
  );
  const pending = watch("pendingSplashImage");
  const isPending = pending !== undefined;
  const isProcessing = !isPending && !!job;
  const pendingUrl = useObjectUrl(pending);
  const processingUrl = useObjectUrl(job?.file);

  const previewUrl = isPending
    ? pendingUrl
    : isProcessing
      ? processingUrl
      : (savedImage?.sizes["750"] ?? Object.values(savedImage?.sizes ?? {})[0]);
  const hasImage = isPending ? !!pending : isProcessing || !!savedImage;

  return (
    <InstanceImageField
      id="splash-image"
      label={t("splashImage")}
      hint={t("splashImageHint", {
        formats: formatAcceptList(SPLASH_IMAGE_ACCEPT),
        maxSize: SPLASH_IMAGE_SIZE_LABEL,
      })}
      accept={SPLASH_IMAGE_ACCEPT}
      maxBytes={MAX_SPLASH_IMAGE_BYTES}
      tooLargeMessage={t("splashImageTooLarge", {
        maxSize: SPLASH_IMAGE_SIZE_LABEL,
      })}
      hasImage={hasImage}
      uploadLabel={t("uploadSplashImage")}
      replaceLabel={t("replaceSplashImage")}
      removeLabel={isProcessing ? undefined : t("removeSplashImage")}
      onChange={(file) =>
        setValue("pendingSplashImage", file, { shouldDirty: true })
      }
      preview={
        previewUrl && (
          <figure
            className="relative m-0 self-start border border-(--mi-tint-x-color)"
            aria-busy={isProcessing}
          >
            <img
              src={previewUrl}
              alt=""
              className={`block h-32 w-auto ${isProcessing ? "opacity-50" : ""}`}
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="medium" />
              </div>
            )}
            <figcaption className="sr-only">
              {t(
                isProcessing
                  ? "splashImageProcessing"
                  : isPending
                    ? "splashImagePendingCaption"
                    : "splashImageSavedCaption"
              )}
            </figcaption>
          </figure>
        )
      }
    />
  );
};

const SplashSettings: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, setValue, watch } = useFormContext<FormSettings>();
  const showCustomSplash = watch("instanceCustomization.showCustomSplash");
  const textPosition =
    watch("instanceCustomization.splashTextPosition") ?? "center";

  return (
    <>
      <FormComponent direction="row">
        <InputEl
          id="input-show-custom-splash"
          type="checkbox"
          aria-describedby="hint-show-custom-splash"
          {...register("instanceCustomization.showCustomSplash")}
        />
        <div className="flex flex-col">
          <label htmlFor="input-show-custom-splash">
            {t("showCustomSplash")}
          </label>
          <small id="hint-show-custom-splash" className="max-w-md">
            {t("showCustomSplashHint")}
          </small>
        </div>
      </FormComponent>

      {showCustomSplash && (
        <>
          <SplashImageField />

          <FormComponent>
            <label htmlFor="input-splash-title">{t("splashTitle")}</label>
            <InputEl
              id="input-splash-title"
              type="text"
              className="max-w-md"
              maxLength={MAX_SPLASH_TITLE_LENGTH}
              aria-describedby="hint-splash-title"
              {...register("instanceCustomization.splashTitle")}
            />
            <small id="hint-splash-title" className="max-w-md">
              {t("splashTitleHint")}
            </small>
          </FormComponent>

          <FormComponent>
            <label htmlFor="input-splash-subtitle">{t("splashSubtitle")}</label>
            <TextArea
              id="input-splash-subtitle"
              className="max-w-md"
              rows={4}
              maxLength={MAX_SPLASH_SUBTITLE_LENGTH}
              aria-describedby="hint-splash-subtitle"
              {...register("instanceCustomization.splashSubtitle")}
            />
            <small id="hint-splash-subtitle" className="max-w-md">
              {t("splashSubtitleHint")}
            </small>
          </FormComponent>

          <FormComponent
            role="group"
            aria-labelledby="label-splash-text-position"
          >
            <span
              id="label-splash-text-position"
              className="text-base font-semibold"
            >
              {t("splashTextPosition")}
            </span>
            <div className="flex flex-wrap gap-4">
              {SPLASH_TEXT_POSITIONS.map(({ value, labelKey }) => (
                <div key={value} className="flex items-center gap-2">
                  <input
                    id={`input-splash-text-position-${value}`}
                    type="radio"
                    name="splash-text-position"
                    value={value}
                    checked={textPosition === value}
                    onChange={() =>
                      setValue(
                        "instanceCustomization.splashTextPosition",
                        value,
                        { shouldDirty: true }
                      )
                    }
                  />
                  <label htmlFor={`input-splash-text-position-${value}`}>
                    {t(labelKey)}
                  </label>
                </div>
              ))}
            </div>
          </FormComponent>
        </>
      )}
    </>
  );
};

export default SplashSettings;
