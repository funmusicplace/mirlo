import { useQueryClient } from "@tanstack/react-query";
import Button, { ButtonAnchor } from "components/common/Button";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import { removeNotification } from "queries/notifications";
import { QUERY_KEY_NOTIFICATIONS } from "queries/queryKeys";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";

import NotificationAvatar from "./NotificationAvatar";

const ActorName: React.FC<{ name: string }> = ({ name }) => (
  <strong>
    <bdi>{name}</bdi>
  </strong>
);

const getUrlHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
};

const FediverseMention: React.FC<{
  notification: Notification;
  compact?: boolean;
  onRemoved?: () => void;
}> = ({ notification, compact, onRemoved }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = React.useState(false);
  const ap = notification.metadata?.ap;

  if (!ap) {
    return null;
  }

  const actorHost = getUrlHost(ap.actor);
  const actorName = ap.actorName || ap.actorHandle || actorHost || ap.actor;
  const actorUsername = ap.actorHandle?.slice(
    0,
    ap.actorHandle.lastIndexOf("@")
  );

  const handleRemove = async () => {
    if (!user?.id || isRemoving) {
      return;
    }
    let removed = false;
    try {
      setIsRemoving(true);
      await removeNotification(user.id, notification.id);
      removed = true;
    } catch (e) {
      if (e instanceof MirloFetchError && e.status === 404) {
        removed = true;
      } else {
        errorHandler(e);
      }
    } finally {
      if (removed) {
        snackbar(t("mentionRemoved"), { type: "success" });
      }
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_NOTIFICATIONS),
      });
      setIsRemoving(false);
    }
    if (removed) {
      onRemoved?.();
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
      <NotificationAvatar name={actorName} compact={compact} />

      <div className="flex-1 min-w-0">
        <div
          className={
            compact
              ? "text-xs text-(--mi-text-color) leading-snug break-words"
              : "text-sm text-(--mi-text-color) break-words"
          }
        >
          <Trans
            t={t}
            i18nKey="mentionedYouOnFediverse"
            components={{ author: <ActorName name={actorName} /> }}
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
        {ap.actorName && actorHost && (
          <div className="flex flex-wrap text-xs text-(--mi-light-foreground-color)">
            {actorUsername && (
              <span className="truncate max-w-full">
                <bdi>{actorUsername}</bdi>
              </span>
            )}
            <span className="max-w-full break-all">
              {actorUsername ? `@${actorHost}` : actorHost}
            </span>
          </div>
        )}
        {ap.contentWarning ? (
          <p className="text-sm italic text-(--mi-light-foreground-color) line-clamp-3 break-words mt-1">
            {ap.contentWarning}
          </p>
        ) : (
          notification.content && (
            <p className="text-sm text-(--mi-text-color) line-clamp-3 break-words mt-1">
              {notification.content}
            </p>
          )
        )}
        <div className="text-xs text-(--mi-light-foreground-color) mt-0.5 flex flex-wrap items-center gap-2">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
          {ap.url && (
            <ButtonAnchor
              variant="link"
              size="compact"
              href={ap.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("viewOnFediverseNewTab")}
            >
              {t("viewOnFediverse")}
            </ButtonAnchor>
          )}
          <Button
            type="button"
            variant="link"
            size="compact"
            aria-disabled={isRemoving}
            isLoading={isRemoving}
            onClick={handleRemove}
          >
            {t("removeMention")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FediverseMention;
