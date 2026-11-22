import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import React from "react";

const CodeForm: React.FC<{
  id: string;
  label: string;
  submitLabel: string;
  isOneTimeCode?: boolean;
  onSubmit: (code: string) => Promise<void>;
}> = ({ id, label, submitLabel, isOneTimeCode, onSubmit }) => {
  const [code, setCode] = React.useState("");
  const [isWorking, setIsWorking] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsWorking(true);
      try {
        await onSubmit(code.trim());
        setCode("");
      } finally {
        setIsWorking(false);
      }
    },
    [code, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <InputEl
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          {...(isOneTimeCode
            ? { inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 }
            : { maxLength: 32 })}
          required
          className="flex-1 min-w-32"
        />
        <Button
          type="submit"
          buttonRole="primary"
          isLoading={isWorking}
          disabled={isWorking || !code.trim()}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CodeForm;
