import React from "react";
import { useTranslation } from "react-i18next";

const UploadFiles = React.forwardRef<
  HTMLInputElement,
  {
    accept?: string;
    hint?: string;
    label: string;
    name?: string;
    nameForId: string;
    onBlur?: (event: any) => void;
    onChange?: (event: any) => void;
  }
>(({ accept, hint, label, name, nameForId, onBlur, onChange }, ref) => {
  const { t } = useTranslation("translation");
  const inputId = `input-${nameForId}`;

  return (
    <div className="relative w-full">
      {/* The `label` element displays the drop/click area and the `input` element and its default UI are visually hidden. `input` is before `label` so that a focus ring can be applied to `label` while the `input` has focus. */}
      <input
        accept={accept}
        className="absolute inset-0 opacity-0 [&:focus-visible~label]:[outline:5px_auto_Highlight] [&:focus-visible~label]:[outline:5px_auto_-webkit-focus-ring-color] [&::file-selector-button]:hidden"
        id={inputId}
        multiple
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        ref={ref}
        type="file"
      />
      {/* This `label` element contains the `label` prop, the `hint` prop, and the instruction in `dropFilesHere` translation. The order of these is intentional so that the last announcement by screenreaders is the instruction. The instruction is placed in a `span` element which is styled to appear as the drop/click area. */}
      <label className="w-full" htmlFor={inputId}>
        <span className="block mbe-2">
          {label}
          {/* Some screenreaders don't pause unless there's punctuation. Because the `label` element contains multiple parts, we need to add a period to the `label` prop if there isn't one so there's a pause after it. Using the `sr-only` visually hidden class causes some screenreaders to announce the period as "dot" instead of pausing, so we hide it visually using opacity only. */}
          <span className="opacity-0">
            {label.endsWith("?") ? "" : label.endsWith(".") ? "" : "."}
          </span>
        </span>
        {!!hint && (
          <span className="block mbe-4 font-normal text-sm">{hint}</span>
        )}
        <span className="cursor-pointer block border-2 border-dashed border-neutral-500 rounded-lg p-8 w-full text-center">
          {t("dropFilesHere", { keyPrefix: "manageAlbum" })}
        </span>
      </label>
    </div>
  );
});

export default UploadFiles;
