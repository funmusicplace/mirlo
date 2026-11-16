import { Turnstile } from "@marsidev/react-turnstile";
import { useTurnstileSiteKey } from "queries/instanceSettings";
import React from "react";

const SpamChallenge: React.FC<{
  onSuccess: (token: string) => void;
  className?: string;
}> = ({ onSuccess, className = "" }) => {
  const siteKey = useTurnstileSiteKey();
  if (!siteKey) {
    return null;
  }
  return (
    <div className={`flex justify-center ${className}`}>
      <Turnstile siteKey={siteKey} onSuccess={onSuccess} />
    </div>
  );
};

export const useSpamChallenge = (className?: string) => {
  const token = React.useRef<string | undefined>(undefined);
  const challenge = (
    <SpamChallenge
      className={className}
      onSuccess={(value) => {
        token.current = value;
      }}
    />
  );
  return { challenge, token };
};

export default SpamChallenge;
