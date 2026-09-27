import { useQueryClient } from "@tanstack/react-query";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import { reportNotificationAsSpam } from "queries/notifications";
import { QUERY_KEY_NOTIFICATIONS } from "queries/queryKeys";
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
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isReporting, setIsReporting] = React.useState(false);

  if (!notification.relatedUser) {
    return null;
  }

  const senderName =
    notification.relatedUser?.name ?? notification.relatedUser?.email;
  const firstLine = notification.content?.split("\n")[0] ?? "";
  const sentAt = formatRelativeTime({ date: notification.createdAt, i18n });

  const senderLine = (
    <>
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
    </>
  );

  const handleReportSpam = async () => {
    if (!user?.id || isReporting) {
      return;
    }
    try {
      setIsReporting(true);
      await reportNotificationAsSpam(user.id, notification.id);
      setIsOpen(false);
      snackbar(t("reportSpamSuccess"), { type: "success" });
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_NOTIFICATIONS),
      });
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
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug"
              : "text-sm text-(--mi-text-color)"
          }
        >
          {senderLine}
        </div>
        {firstLine && (
          <p className="text-sm text-(--mi-text-color) truncate mt-1">
            {firstLine}
          </p>
        )}
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5 flex items-center gap-2">
          {sentAt}
          <Button
            type="button"
            variant="link"
            size="compact"
            onClick={() => setIsOpen(true)}
          >
            {t("viewMessage")}
          </Button>
        </div>
      </div>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("messageFrom", { senderName })}
        size="small"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">{senderLine}</p>
          <p className="whitespace-pre-wrap">{notification.content}</p>
          <div className="flex items-center justify-between gap-2">
            <small className="text-(--mi-light-foreground-color)">
              {sentAt}
            </small>
            <Button
              type="button"
              variant="outlined"
              disabled={isReporting}
              isLoading={isReporting}
              onClick={handleReportSpam}
            >
              {t("reportSpam")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ArtistContactMessage;
