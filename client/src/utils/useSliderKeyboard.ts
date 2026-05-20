import React from "react";

export const useSliderKeyboard = ({
  value,
  min,
  max,
  step,
  largeStep,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  largeStep?: number;
  onChange: (next: number) => void;
}) => {
  return (event: React.KeyboardEvent) => {
    if (max <= min) return;
    let next = value;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = value - step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = value + step;
        break;
      case "PageDown":
        next = value - (largeStep ?? step);
        break;
      case "PageUp":
        next = value + (largeStep ?? step);
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(Math.max(min, Math.min(max, next)));
  };
};
