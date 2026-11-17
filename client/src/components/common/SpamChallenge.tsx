import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { useTurnstileSiteKey } from "queries/instanceSettings";
import React from "react";

const SpamChallenge = React.forwardRef<
  TurnstileInstance | undefined,
  {
    onSuccess: (token: string) => void;
    className?: string;
  }
>(({ onSuccess, className = "" }, ref) => {
  const siteKey = useTurnstileSiteKey();
  if (!siteKey) {
    return null;
  }
  return (
    <div className={`flex justify-center ${className}`}>
      <Turnstile ref={ref} siteKey={siteKey} onSuccess={onSuccess} />
    </div>
  );
});
SpamChallenge.displayName = "SpamChallenge";

export const useSpamChallenge = (className?: string) => {
  const token = React.useRef<string | undefined>(undefined);
  const widget = React.useRef<TurnstileInstance | undefined>(undefined);
  const reset = React.useCallback(() => {
    token.current = undefined;
    widget.current?.reset();
  }, []);
  const challenge = (
    <SpamChallenge
      ref={widget}
      className={className}
      onSuccess={(value) => {
        token.current = value;
      }}
    />
  );
  return { challenge, token, reset };
};

export default SpamChallenge;
