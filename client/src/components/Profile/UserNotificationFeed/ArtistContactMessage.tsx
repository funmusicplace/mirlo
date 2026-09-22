import Button from "components/common/Button";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import { reportNotificationAsSpam } from "queries/notifications";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";

const ArtistContactMessage: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isReported, setIsReported] = React.useState(
    !!notification.spamReportedAt
  );
  const [isReporting, setIsReporting] = React.useState(false);

  if (!notification.relatedUser) {
    return null;
  }

  const senderName =
    notification.relatedUser?.name ?? notification.relatedUser?.email;

  const handleReportSpam = async () => {
    if (!user?.id || isReporting || isReported) {
      return;
    }
    try {
      setIsReporting(true);
      await reportNotificationAsSpam(user.id, notification.id);
      setIsReported(true);
      snackbar(t("reportSpamSuccess"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "flex items-start gap-2.5 py-2 px-3"
          : "flex items-start gap-3.5 py-3.5 px-4"
      }
    >
      <div
        className={
          compact
            ? "w-7 h-7 rounded-full shrink-0 bg-(--mi-pink) flex items-center justify-center font-bold text-xs text-white"
            : "w-11 h-11 rounded-full shrink-0 bg-(--mi-pink) flex items-center justify-center font-bold text-base text-white"
        }
      >
        {(senderName?.[0] ?? "?").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-pink) mb-1">
            {t("newMessage")}
          </div>
        )}
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug"
              : "text-sm text-(--mi-text-color)"
          }
        >
          <Trans
            t={t}
            i18nKey="sentYouAMessage"
            values={{ senderName }}
            components={{ author: <strong /> }}
          />
          {notification.artist && (
            <>
              {": "}
              <Link to={getArtistUrl(notification.artist)}>
                {notification.artist.name}
              </Link>
            </>
          )}
        </div>
        {notification.content && !compact && (
          <p className="text-sm text-(--mi-text-color) whitespace-pre-wrap mt-1">
            {notification.content}
          </p>
        )}
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5 flex items-center gap-2">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
          {!compact && (
            <Button
              variant="link"
              size="compact"
              disabled={isReporting || isReported}
              isLoading={isReporting}
              onClick={handleReportSpam}
            >
              {isReported ? t("reportedSpam") : t("reportSpam")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistContactMessage;
