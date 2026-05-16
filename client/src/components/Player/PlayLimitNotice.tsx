import React from "react";
import { useTranslation } from "react-i18next";

export type PlayLimit = {
  remaining: number;
  max: number;
  exceeded: boolean;
};

// Show the soft "free plays left" notice once the listener is within this
// many plays of the cap — gives them a heads-up without nagging on the very
// first listen (per #1760's discussion).
export const PLAYS_REMAINING_NOTICE_THRESHOLD = 2;

export const PlayLimitText: React.FC<{
  playLimit: PlayLimit;
  hideLastPlay?: boolean;
  short?: boolean;
}> = ({ playLimit, hideLastPlay, short }) => {
  const { t } = useTranslation("translation", { keyPrefix: "player" });

  if (playLimit.remaining === 0) {
    if (hideLastPlay) return null;
    return (
      <small
        data-cy="play-limit-exceeded-notice"
        className="text-[0.65rem] leading-none whitespace-nowrap opacity-80"
      >
        {t("thisIsYourLastPlay")}
      </small>
    );
  }
  if (playLimit.remaining <= PLAYS_REMAINING_NOTICE_THRESHOLD) {
    return (
      <small
        data-cy="plays-remaining-notice"
        className="text-[0.65rem] leading-none whitespace-nowrap opacity-80"
      >
        {short && <span aria-hidden>{"· "}</span>}
        {t(short ? "playsRemainingShort" : "playsRemaining", {
          count: playLimit.remaining,
        })}
      </small>
    );
  }
  return null;
};
