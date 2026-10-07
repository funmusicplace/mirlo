import { InputEl } from "components/common/Input";
import React from "react";

const SetupInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <InputEl ref={ref} className="text-xl! px-4! py-3!" {...props} />
));

SetupInput.displayName = "SetupInput";

export default SetupInput;
