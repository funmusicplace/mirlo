import Button from "components/common/Button";
import { WidthWrapper } from "components/common/WidthContainer";
import {
  OAuthInteraction,
  useRequestOAuthApprovalMutation,
} from "queries/oauth";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function NotApproved({
  uid,
  interaction,
  onBack,
  isLeaving,
}: {
  uid: string;
  interaction: OAuthInteraction;
  onBack: () => void;
  isLeaving: boolean;
}) {
  const { t } = useTranslation("translation", { keyPrefix: "oauth" });
  const navigate = useNavigate();
  const { mutate: requestApproval, isPending } =
    useRequestOAuthApprovalMutation(uid);
  const { client, approval, loggedIn } = interaction;

  const onRequest = () => {
    if (!loggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/auth/oauth/${uid}`)}`);
      return;
    }
    requestApproval();
  };

  return (
    <WidthWrapper variant="small" className="mt-8! mb-12!">
      <h1 className="text-xl! mb-4!">
        {t("notApproved", {
          app: client.name,
          domain: client.domain,
          site: window.location.host,
        })}
      </h1>
      {approval === "pending" ? (
        <p className="mb-4">{t("approvalRequested")}</p>
      ) : (
        <p className="mb-4">{t("notApprovedExplanation")}</p>
      )}
      <div className="flex gap-4 flex-wrap">
        {approval === "unknown" && (
          <Button
            buttonRole="primary"
            onClick={onRequest}
            isLoading={isPending}
            disabled={isPending}
          >
            {t("requestApproval")}
          </Button>
        )}
        <Button variant="outlined" onClick={onBack} disabled={isLeaving}>
          {t("backToApp", { app: client.name })}
        </Button>
      </div>
    </WidthWrapper>
  );
}

export default NotApproved;
