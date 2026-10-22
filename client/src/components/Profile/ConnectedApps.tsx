import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import {
  queryConnectedApps,
  useRevokeConnectedAppMutation,
} from "queries/oauth";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";

import ProfileSection from "./ProfileSection";

const ConnectedApps: React.FC<{ userId: number }> = ({ userId }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });
  const { data: apps = [] } = useQuery(queryConnectedApps(userId));
  const {
    mutate: revoke,
    isPending,
    variables,
  } = useRevokeConnectedAppMutation(userId);

  if (apps.length === 0) {
    return null;
  }

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString(i18n.language) : t("never");

  return (
    <ProfileSection>
      <h2>{t("connectedApps")}</h2>
      <p>{t("connectedAppsDescription")}</p>
      <ul className="flex flex-col gap-4 mt-4">
        {apps.map((app) => (
          <li
            key={app.id}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <div>
              <strong>{app.name}</strong>
              {app.url && (
                <span className="ml-2 text-(--mi-lighten-foreground-color)">
                  {app.url}
                </span>
              )}
              <div className="text-sm text-(--mi-lighten-foreground-color)">
                {t("connectedAppDetails", {
                  scopes: app.scopes.join(", "),
                  lastUsed: formatDate(app.lastUsedAt),
                })}
              </div>
            </div>
            <Button
              variant="outlined"
              buttonRole="warning"
              onClick={() => revoke(app.id)}
              isLoading={isPending && variables === app.id}
              disabled={isPending}
            >
              {t("disconnectApp")}
            </Button>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
};

const ConnectedAppsForUser: React.FC = () => {
  const { user } = useAuthContext();
  return user ? <ConnectedApps userId={user.id} /> : null;
};

export default ConnectedAppsForUser;
