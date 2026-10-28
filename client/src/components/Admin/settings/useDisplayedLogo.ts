import { useInstanceSettings } from "queries/instanceSettings";
import { useFormContext } from "react-hook-form";
import useObjectUrl from "utils/useObjectUrl";

import { FormSettings, LOGO_FIELDS, LogoKind } from "./settingsForm";

export const useDisplayedLogo = (kind: LogoKind) => {
  const { name, savedKey } = LOGO_FIELDS[kind];
  const { watch } = useFormContext<FormSettings>();
  const savedLogo = useInstanceSettings()[savedKey];
  const pending = watch(name);
  const pendingUrl = useObjectUrl(pending);

  if (pending === undefined) {
    return {
      logo: savedLogo ?? undefined,
      isPending: false,
      hasLogo: !!savedLogo,
      hasSavedLogo: !!savedLogo,
    };
  }
  return {
    logo: pending && pendingUrl ? { url: pendingUrl } : undefined,
    isPending: true,
    hasLogo: !!pending,
    hasSavedLogo: !!savedLogo,
  };
};
