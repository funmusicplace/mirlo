import { useTranslation } from "react-i18next";

const DESCRIBED_SCOPES = [
  "openid",
  "profile",
  "email",
  "subscribers:read",
  "offline_access",
];

function ConsentScopes({ scopes }: { scopes: string[] }) {
  const { t } = useTranslation("translation", { keyPrefix: "oauth.scopes" });

  return (
    <>
      {scopes.includes("account") && (
        <p className="mb-4 p-4 border-2 border-(--mi-warning-color) rounded">
          <strong>{t("account")}</strong> {t("accountWarning")}
        </p>
      )}
      <ul className="list-disc pl-6 flex flex-col gap-2">
        {scopes
          .filter((scope) => DESCRIBED_SCOPES.includes(scope))
          .map((scope) => (
            <li key={scope}>{t(scope)}</li>
          ))}
      </ul>
    </>
  );
}

export default ConsentScopes;
