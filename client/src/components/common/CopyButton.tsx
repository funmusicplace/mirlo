import React from "react";
import { FaRegCopy } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

import Button, { ButtonProps } from "./Button";

const CopyButton: React.FC<
  {
    text: string;
    successMessage?: string;
  } & Omit<
    ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "startIcon" | "children"
  >
> = ({ text, successMessage, ...buttonProps }) => {
  const snackbar = useSnackbar();

  const onClick = React.useCallback(async () => {
    await navigator.clipboard.writeText(text);
    snackbar(successMessage ?? "Copied to clipboard", { type: "success" });
  }, [text, successMessage, snackbar]);

  return (
    <Button
      onlyIcon
      size="compact"
      variant="transparent"
      startIcon={<FaRegCopy />}
      onClick={onClick}
      {...buttonProps}
    />
  );
};

export default CopyButton;
