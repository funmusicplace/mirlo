import React from "react";

export function useFitsBeside(enabled: boolean) {
  const referenceRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [fits, setFits] = React.useState(false);

  React.useLayoutEffect(() => {
    const reference = referenceRef.current;
    const content = contentRef.current;
    if (!enabled || !reference || !content) {
      return;
    }
    const measure = () => {
      setFits(content.offsetHeight <= reference.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(reference);
    observer.observe(content);
    return () => observer.disconnect();
  }, [enabled]);

  return { referenceRef, contentRef, fits };
}
