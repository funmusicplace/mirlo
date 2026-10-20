import { useTranslation } from "react-i18next";

const SCOPE_KEYS: Record<string, string> = {
  openid: "openid",
  profile: "profile",
  email: "email",
  "subscribers:read": "subscribersRead",
  offline_access: "offline_access",
};

function ConsentScopes({ scopes }: { scopes: string[] }) {
  const { t } = useTranslation("translation", { keyPrefix: "oauth.scopes" });

  return (
    <>
      {scopes.includes("api") && (
        <p className="mb-4 p-4 border-2 border-(--mi-warning-color) rounded">
          <strong>{t("api")}</strong> {t("apiWarning")}
        </p>
      )}
      <ul className="list-disc pl-6 flex flex-col gap-2">
        {scopes
          .filter((scope) => SCOPE_KEYS[scope])
          .map((scope) => (
            <li key={scope}>{t(SCOPE_KEYS[scope])}</li>
          ))}
      </ul>
    </>
  );
}

export default ConsentScopes;
