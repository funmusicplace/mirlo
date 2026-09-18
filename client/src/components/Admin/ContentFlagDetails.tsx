import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { AdminContentFlag } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

const KNOWN_FLAG_REASONS = ["copyrightViolation", "inappropriateContent"];

const SHORT_DESCRIPTION_MAX_LENGTH = 160;

const ContentFlagDetails: React.FC<{ flag: AdminContentFlag }> = ({ flag }) => {
  const { t } = useTranslation("translation", { keyPrefix: "flaggedContent" });
  const { t: tReason } = useTranslation("translation", { keyPrefix: "artist" });
  const [isReportOpen, setIsReportOpen] = React.useState(false);

  const reasonLabel =
    flag.reason && KNOWN_FLAG_REASONS.includes(flag.reason)
      ? tReason(flag.reason)
      : flag.reason;
  const isLongDescription =
    !!flag.description &&
    (flag.description.length > SHORT_DESCRIPTION_MAX_LENGTH ||
      flag.description.includes("\n"));

  if (flag.source !== "USER_REPORT") {
    return (
      <div className="flex flex-col gap-1">
        <small>{t("sourceSightEngine")}</small>
        <span>
          {t("imageScore", {
            model: flag.imageModel,
            score: flag.score?.toFixed(2),
          })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <small>{t("sourceUserReport")}</small>
      <strong>{reasonLabel}</strong>
      {flag.description && (
        <span
          className={
            isLongDescription
              ? "whitespace-pre-wrap line-clamp-3"
              : "whitespace-pre-wrap"
          }
        >
          {flag.description}
        </span>
      )}
      {isLongDescription && (
        <Button
          type="button"
          size="compact"
          variant="link"
          onClick={() => setIsReportOpen(true)}
        >
          {t("readFullReport")}
        </Button>
      )}
      {flag.reporterEmail && (
        <small>{t("reportedBy", { email: flag.reporterEmail })}</small>
      )}
      {isLongDescription && (
        <Modal
          open={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          title={reasonLabel}
          size="small"
        >
          <div className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap">{flag.description}</p>
            {flag.reporterEmail && (
              <small>{t("reportedBy", { email: flag.reporterEmail })}</small>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ContentFlagDetails;
