import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import CopyButton from "components/common/CopyButton";
import {
  querySubsonicCredential,
  useCreateSubsonicCredentialMutation,
  useDeleteSubsonicCredentialMutation,
} from "queries/subsonic";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

import ProfileSection from "./ProfileSection";

const CredentialRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <dt className="text-sm text-(--mi-light-foreground-color)">{label}</dt>
    <dd className="flex items-center gap-2">
      <code className="break-all">{value}</code>
      <CopyButton text={value} title={label} aria-label={label} />
    </dd>
  </div>
);

const SubsonicCredentials: React.FC<{ userId: number }> = ({ userId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const errorHandler = useErrorHandler();
  const { data: credential } = useQuery(querySubsonicCredential(userId));
  const { mutate: generate, isPending: isGenerating } =
    useCreateSubsonicCredentialMutation(userId);
  const { mutate: revoke, isPending: isRevoking } =
    useDeleteSubsonicCredentialMutation(userId);
  const isPending = isGenerating || isRevoking;
  const options = { onError: (e: unknown) => errorHandler(e) };

  if (credential === undefined) {
    return null;
  }

  return (
    <ProfileSection>
      <h2>{t("subsonicApps")}</h2>
      <p>{t("subsonicAppsDescription")}</p>
      {credential && (
        <dl className="flex flex-col gap-3 mt-4">
          <CredentialRow
            label={t("subsonicServerUrl")}
            value={credential.serverUrl}
          />
          <CredentialRow
            label={t("subsonicUsername")}
            value={credential.username}
          />
          <CredentialRow
            label={t("subsonicPassword")}
            value={credential.password}
          />
        </dl>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          variant="outlined"
          onClick={() => generate(undefined, options)}
          isLoading={isGenerating}
          disabled={isPending}
        >
          {credential ? t("subsonicRegenerate") : t("subsonicGenerate")}
        </Button>
        {credential && (
          <Button
            variant="outlined"
            buttonRole="warning"
            onClick={() => revoke(undefined, options)}
            isLoading={isRevoking}
            disabled={isPending}
          >
            {t("subsonicRevoke")}
          </Button>
        )}
      </div>
    </ProfileSection>
  );
};

const SubsonicCredentialsForUser: React.FC = () => {
  const { user } = useAuthContext();
  return user ? <SubsonicCredentials userId={user.id} /> : null;
};

export default SubsonicCredentialsForUser;
