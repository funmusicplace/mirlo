import React from "react";

export const SETUP_LEAD_ID = "setup-lead";

const SetupHeading: React.FC<{ kicker?: string; lead: string }> = ({
  kicker,
  lead,
}) => (
  <>
    {kicker && (
      <p className="mb-3 text-xs uppercase tracking-widest opacity-60">
        {kicker}
      </p>
    )}
    <h1
      id={SETUP_LEAD_ID}
      className="mb-8! text-2xl! leading-snug! font-semibold!"
    >
      {lead}
    </h1>
  </>
);

export default SetupHeading;
