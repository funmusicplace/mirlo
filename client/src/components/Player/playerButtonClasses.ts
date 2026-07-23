/** Shared Tailwind hover styles for inactive player control buttons. */
export const playerControlHoverClass = [
  "hover:not-disabled:bg-(--mi-button-text-color)!",
  "hover:not-disabled:text-(--mi-button-color)!",
  "hover:not-disabled:border-(--mi-button-color)!",
  "hover:not-disabled:[filter:none]!",
  "focus-visible:not-disabled:bg-(--mi-button-text-color)!",
  "focus-visible:not-disabled:text-(--mi-button-color)!",
  "focus-visible:not-disabled:border-(--mi-button-color)!",
  "focus-visible:not-disabled:[filter:none]!",
  "hover:not-disabled:[&_svg]:fill-(--mi-button-color)!",
  "focus-visible:not-disabled:[&_svg]:fill-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:hover:not-disabled:bg-[color-mix(in_srgb,var(--mi-fixed-fg-color)_14%,var(--mi-fixed-bg-color))]!",
  "[[data-mi-high-contrast]_&]:focus-visible:not-disabled:bg-[color-mix(in_srgb,var(--mi-fixed-fg-color)_14%,var(--mi-fixed-bg-color))]!",
  "[[data-mi-high-contrast]_&]:hover:not-disabled:text-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:focus-visible:not-disabled:text-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:hover:not-disabled:border-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:focus-visible:not-disabled:border-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:hover:not-disabled:[&_svg]:fill-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:focus-visible:not-disabled:[&_svg]:fill-(--mi-button-color)!",
].join(" ");

/**
 * Same as {@link playerControlHoverClass}, for wrappers that contain a button
 * (e.g. PlayControlButton).
 */
export const playerControlHoverWrapperClass = [
  "[&_button:hover:not(:disabled)]:bg-(--mi-button-text-color)!",
  "[&_button:hover:not(:disabled)]:text-(--mi-button-color)!",
  "[&_button:hover:not(:disabled)]:border-(--mi-button-color)!",
  "[&_button:hover:not(:disabled)]:[filter:none]!",
  "[&_button:focus-visible:not(:disabled)]:bg-(--mi-button-text-color)!",
  "[&_button:focus-visible:not(:disabled)]:text-(--mi-button-color)!",
  "[&_button:focus-visible:not(:disabled)]:border-(--mi-button-color)!",
  "[&_button:focus-visible:not(:disabled)]:[filter:none]!",
  "[&_button:hover:not(:disabled)_svg]:fill-(--mi-button-color)!",
  "[&_button:focus-visible:not(:disabled)_svg]:fill-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)]:bg-[color-mix(in_srgb,var(--mi-fixed-fg-color)_14%,var(--mi-fixed-bg-color))]!",
  "[[data-mi-high-contrast]_&]:[&_button:focus-visible:not(:disabled)]:bg-[color-mix(in_srgb,var(--mi-fixed-fg-color)_14%,var(--mi-fixed-bg-color))]!",
  "[[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)]:text-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:[&_button:focus-visible:not(:disabled)]:text-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)]:border-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:[&_button:focus-visible:not(:disabled)]:border-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:[&_button:hover:not(:disabled)_svg]:fill-(--mi-button-color)!",
  "[[data-mi-high-contrast]_&]:[&_button:focus-visible:not(:disabled)_svg]:fill-(--mi-button-color)!",
].join(" ");

/** Hover styles when a player toggle (loop/shuffle) is active. */
export const playerToggleActiveHoverClass = [
  "hover:not-disabled:bg-(--mi-button-color)!",
  "hover:not-disabled:text-(--mi-button-text-color)!",
  "hover:not-disabled:border-(--mi-button-color)!",
  "hover:not-disabled:brightness-95!",
  "hover:not-disabled:saturate-30!",
  "focus-visible:not-disabled:bg-(--mi-button-color)!",
  "focus-visible:not-disabled:text-(--mi-button-text-color)!",
  "focus-visible:not-disabled:border-(--mi-button-color)!",
  "focus-visible:not-disabled:brightness-95!",
  "focus-visible:not-disabled:saturate-30!",
  "hover:not-disabled:[&_svg]:fill-(--mi-button-text-color)!",
  "focus-visible:not-disabled:[&_svg]:fill-(--mi-button-text-color)!",
].join(" ");

/** Hover styles for the player volume mute button. */
export const playerVolumeHoverClass = [
  "hover:not-disabled:bg-transparent!",
  "hover:not-disabled:border-transparent!",
  "hover:not-disabled:brightness-80",
  "hover:not-disabled:saturate-30",
  "focus-visible:not-disabled:bg-transparent!",
  "focus-visible:not-disabled:border-transparent!",
  "focus-visible:not-disabled:brightness-80",
  "focus-visible:not-disabled:saturate-30",
].join(" ");
