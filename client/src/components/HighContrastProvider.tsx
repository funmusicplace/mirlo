import React from "react";

import { useHighContrast } from "hooks/useHighContrast";
import { usePrefersColorScheme } from "hooks/usePrefersColorScheme";

const HighContrastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highContrast = useHighContrast();
  const prefersDark = usePrefersColorScheme();

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.dataset.miHighContrast = prefersDark ? "dark" : "light";
    } else {
      delete root.dataset.miHighContrast;
    }
  }, [highContrast, prefersDark]);

  return <>{children}</>;
};

export default HighContrastProvider;
