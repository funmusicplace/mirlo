import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { useFormContext } from "react-hook-form";

import { FormSettings, LOGO_FIELDS, LogoKind } from "./settingsForm";

const useObjectUrl = (file: File | null | undefined) => {
  const [url, setUrl] = React.useState<string>();

  React.useEffect(() => {
    if (!file) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
};

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
