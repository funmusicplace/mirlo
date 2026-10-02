import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

const ManagerInvite: React.FC<{
  notification: Notification;
  compact?: boolean;
}> = ({ notification, compact }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  if (!notification.artist) {
    return null;
  }

  const textSize = compact ? "text-xs leading-snug" : "text-sm";

  return (
    <div className={compact ? "py-2 px-3" : "py-3.5 px-4"}>
      {!compact && (
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-neutral-500) mb-1">
          {t("managerInviteTag")}
        </div>
      )}
      <div className={`${textSize} text-(--mi-text-color)`}>
        <Trans
          t={t}
          i18nKey="inviteToManageArtist"
          values={{
            inviterName: notification.relatedUser?.name ?? "",
            artistName: notification.artist.name,
          }}
          components={{
            bold: <strong />,
            artistLink: (
              <Link
                to={getArtistUrl(notification.artist)}
                className="font-bold"
              />
            ),
          }}
        />
      </div>
      <Link
        to="/manage"
        className={`flex items-center gap-1 font-semibold mt-0.5 ${textSize}`}
      >
        {t("reviewInvite")}
        <FaChevronRight className="shrink-0 text-xs" />
      </Link>
      <div className="text-xs text-(--mi-light-foreground-color) mt-0.5">
        {formatRelativeTime({ date: notification.createdAt, i18n })}
      </div>
    </div>
  );
};

export default ManagerInvite;
