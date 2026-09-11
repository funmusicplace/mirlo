import { useTranslation } from "react-i18next";
import { useMatches } from "react-router-dom";

export type RouteTitleHandle = {
  title?: string;
};

const useRouteTitle = () => {
  const { t } = useTranslation("translation", { keyPrefix: "pageTitles" });
  const matches = useMatches();

  const key = matches.reduceRight<string | undefined>(
    (found, match) => found ?? (match.handle as RouteTitleHandle)?.title,
    undefined
  );

  return key ? t(key) : undefined;
};

export default useRouteTitle;
