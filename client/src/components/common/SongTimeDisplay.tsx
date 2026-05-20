import { css } from "@emotion/css";
import React from "react";
import { useSliderKeyboard } from "utils/useSliderKeyboard";

const SEEK_RESYNC_TOLERANCE = 0.02;
const KEYBOARD_STEP_SECONDS = 5;
const KEYBOARD_LARGE_STEP_SECONDS = 30;

export const SongTimeDisplay: React.FC<{
  position: string;
  playerRef: React.RefObject<HTMLVideoElement>;
  currentSeconds: number;
  compact?: boolean;
}> = ({ playerRef, currentSeconds, position, compact = false }) => {
  const duration = playerRef.current?.duration ?? 0;
  const percent = currentSeconds / duration;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragPercent, setDragPercent] = React.useState<number | null>(null);
  const [heldPosition, setHeldPosition] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (
      heldPosition !== null &&
      Math.abs(percent - heldPosition) < SEEK_RESYNC_TOLERANCE
    ) {
      setHeldPosition(null);
    }
  }, [percent, heldPosition]);

  const computePercent = React.useCallback((clientX: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const seekTo = React.useCallback(
    (newSeconds: number) => {
      if (!playerRef.current || !isFinite(duration) || duration <= 0) return;
      const clamped = Math.max(0, Math.min(duration, newSeconds));
      const wasPlaying = !playerRef.current.paused;
      playerRef.current.currentTime = clamped;
      if (wasPlaying) playerRef.current.play().catch(() => {});
      setHeldPosition(clamped / duration);
    },
    [duration, playerRef]
  );

  React.useEffect(() => {
    if (!isDragging) return;
    const onMove = (event: PointerEvent) => {
      const p = computePercent(event.clientX);
      if (p !== null) setDragPercent(p);
    };
    const onUp = (event: PointerEvent) => {
      const p = computePercent(event.clientX);
      if (p !== null && isFinite(duration)) seekTo(p * duration);
      setIsDragging(false);
      setDragPercent(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging, computePercent, duration, seekTo]);

  const onKeyDown = useSliderKeyboard({
    value: currentSeconds,
    min: 0,
    max: isFinite(duration) ? duration : 0,
    step: KEYBOARD_STEP_SECONDS,
    largeStep: KEYBOARD_LARGE_STEP_SECONDS,
    onChange: seekTo,
  });

  const displayPercent =
    isDragging && dragPercent !== null
      ? dragPercent
      : heldPosition !== null
        ? heldPosition
        : percent;

  const valueNow = Math.round(displayPercent * duration) || 0;

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Track progress"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration) || 0}
      aria-valuenow={valueNow}
      tabIndex={0}
      className={css`
        height: 1rem;
        filter: brightness(1);
        cursor: pointer;
        width: 100%;
        top: -0.25rem;
        position: ${position};
      `}
      onPointerDown={(event) => {
        const p = computePercent(event.clientX);
        if (p === null) return;
        setDragPercent(p);
        setIsDragging(true);
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className={css`
          height: ${compact ? "1rem" : "0.4rem"};
          overflow: none;
          transition: 0.2s width;
          width: ${displayPercent * 100}%;
          background: var(--mi-button-color);
          pointer-events: none;
          ${compact
            ? `
            position: relative;

            &::before {
              content: "";
              position: absolute;
              right: -4px;
              top: -4px;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--mi-button-text-color);
            }

            &::after {
              content: "";
              position: absolute;
              right: -1px;
              top: 0;
              width: 2px;
              height: 100%;
              background: var(--mi-button-text-color);
            }
          `
            : ""}
        `}
      ></div>
    </div>
  );
};

export default SongTimeDisplay;
