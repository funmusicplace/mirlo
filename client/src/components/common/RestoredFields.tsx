import React from "react";
import { useTranslation } from "react-i18next";

const RestoredFieldsContext = React.createContext<Set<string>>(new Set());

export const RestoredFieldsProvider: React.FC<{
  fields: string[];
  children: React.ReactNode;
}> = ({ fields, children }) => {
  const value = React.useMemo(() => new Set(fields), [fields]);
  return (
    <RestoredFieldsContext.Provider value={value}>
      {children}
    </RestoredFieldsContext.Provider>
  );
};

export const RestoredLabel: React.FC<{
  htmlFor: string;
  field: string;
  children: React.ReactNode;
}> = ({ htmlFor, field, children }) => (
  <label htmlFor={htmlFor}>
    {children}
    <RestoredDot name={field} />
  </label>
);

export const RestoredDot: React.FC<{ name: string }> = ({ name }) => {
  const { t } = useTranslation("translation", { keyPrefix: "common" });
  const restored = React.useContext(RestoredFieldsContext);
  if (!restored.has(name)) return null;
  return (
    <span
      role="img"
      aria-label={t("restoredFromDraft")}
      title={t("restoredFromDraft")}
      className="inline-block w-1 h-1 ml-0.5 mt-1 rounded-full bg-(--mi-info-background-color) align-top"
    />
  );
};
