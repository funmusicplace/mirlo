import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isTrackGroupPublished } from "utils/artist";

const VisibilityRadio: React.FC<{
  existingObject: TrackGroup;
}> = ({ existingObject }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { watch, setValue } = useFormContext();
  const isPublished = isTrackGroupPublished(existingObject);
  const isPublic = watch("isPublic") ?? existingObject.isPublic;

  const handleChange = (nextValue: boolean) => {
    setValue("isPublic", nextValue, { shouldDirty: true });
  };

  return (
    <fieldset className="flex flex-col gap-2 mt-4">
      <legend className="font-semibold mb-2">
        {t(isPublished ? "visibilityPublished" : "visibility")}
      </legend>
      <label
        htmlFor="input-visibility-public"
        className="flex items-start gap-2 cursor-pointer"
      >
        <InputEl
          id="input-visibility-public"
          type="radio"
          name="visibility"
          checked={isPublic}
          onChange={() => handleChange(true)}
          aria-describedby="hint-visibility-public"
          className="mt-1 w-4 shrink-0"
        />
        <div>
          <span className="font-medium">{t("visibilityPublicLabel")}</span>
          <small id="hint-visibility-public" className="block mt-1">
            {t(
              !isPublished
                ? "visibilityPublicHint"
                : existingObject.isPublic || existingObject.hasNotifiedFollowers
                  ? "visibilityPublicHintPublished"
                  : "visibilityPublicHintPublishedNotYetNotified"
            )}
          </small>
        </div>
      </label>
      <label
        htmlFor="input-visibility-private"
        className="flex items-start gap-2 cursor-pointer"
      >
        <InputEl
          id="input-visibility-private"
          type="radio"
          name="visibility"
          checked={!isPublic}
          onChange={() => handleChange(false)}
          aria-describedby="hint-visibility-private"
          className="mt-1 w-4 shrink-0"
        />
        <div>
          <span className="font-medium">{t("visibilityPrivateLabel")}</span>
          <small id="hint-visibility-private" className="block mt-1">
            {t(
              isPublished
                ? "visibilityPrivateHintPublished"
                : "visibilityPrivateHint"
            )}
          </small>
        </div>
      </label>
    </fieldset>
  );
};

export default VisibilityRadio;
