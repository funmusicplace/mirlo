import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { FaTrash, FaUpload } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

const InstanceImageField: React.FC<{
  id: string;
  label: string;
  hint: string;
  accept: string;
  maxBytes: number;
  tooLargeMessage: string;
  hasImage: boolean;
  uploadLabel: string;
  replaceLabel: string;
  removeLabel?: string;
  preview?: React.ReactNode;
  onChange: (file: File | null) => void;
}> = ({
  id,
  label,
  hint,
  accept,
  maxBytes,
  tooLargeMessage,
  hasImage,
  uploadLabel,
  replaceLabel,
  removeLabel,
  preview,
  onChange,
}) => {
  const snackbar = useSnackbar();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const actionsRef = React.useRef<HTMLDivElement | null>(null);
  const labelId = `label-${id}`;
  const hintId = `hint-${id}`;

  const change = (file: File | null) => {
    onChange(file);
    actionsRef.current?.querySelector("button")?.focus();
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > maxBytes) {
      snackbar(tooLargeMessage, { type: "warning" });
      return;
    }
    change(file);
  };

  return (
    <FormComponent role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={`input-${id}`}>
        {label}
      </label>
      {preview}
      <input
        ref={inputRef}
        id={`input-${id}`}
        type="file"
        accept={accept}
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
          {hasImage ? replaceLabel : uploadLabel}
        </Button>
        {hasImage && removeLabel && (
          <Button
            type="button"
            variant="outlined"
            startIcon={<FaTrash />}
            onClick={() => change(null)}
          >
            {removeLabel}
          </Button>
        )}
      </div>
      <small id={hintId}>{hint}</small>
    </FormComponent>
  );
};

export default InstanceImageField;
