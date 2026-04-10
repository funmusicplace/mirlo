import { ButtonLink } from "components/common/Button";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistManageUrl, getArtistUrl } from "utils/artist";
import { formatRelativeTime } from "components/TrackGroup/ReleaseDate";

const LabelInvite: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "notifications",
  });

  if (!notification.artist) {
    return null;
  }
  const labelArtist = notification?.relatedUser?.artists?.find(
    (a) => a.isLabelProfile
  );
  if (!labelArtist) {
    return null;
  }

  const avatarUrl = labelArtist.avatar?.sizes?.[60];

  return (
    <div className="flex items-start gap-3.5 py-3.5 px-4">
      <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-(--mi-neutral-500) flex items-center justify-center font-bold text-sm text-white">
        {avatarUrl ? (
          <ImageWithPlaceholder
            src={avatarUrl}
            alt={labelArtist.name}
            size={40}
            square={false}
            objectFit="cover"
            className="w-10 h-10 rounded-full block"
          />
        ) : (
          (labelArtist.name?.[0] ?? "L").toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-(--mi-neutral-500)">
          {t("labelTag")}
        </div>
        <p>
          <Link to={getArtistUrl(labelArtist)} className="font-bold">
            {labelArtist.name}
          </Link>{" "}
          {t("inviteToJoinLabel")}
        </p>
        <p>
          {t("manageOnArtistPage")}{" "}
          <ButtonLink
            endIcon={<FaChevronRight />}
            variant="link"
            size="compact"
            to={
              getArtistManageUrl(notification.artist.id) + "/customize#labels"
            }
          >
            {notification.artist?.name}
          </ButtonLink>
        </p>
        <div className="text-xs text-(--mi-light-foreground-color)">
          {formatRelativeTime({ date: notification.createdAt, i18n })}
        </div>
      </div>
    </div>
  );
};

export default LabelInvite;
