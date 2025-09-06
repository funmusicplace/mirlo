import { css } from "@emotion/css";
import { ButtonLink } from "components/common/Button";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistManageUrl, getArtistUrl, getReleaseUrl } from "utils/artist";

const LabelInvite: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "notifications" });

  if (!notification.artist) {
    return null;
  }
  const labelArtist = notification?.relatedUser?.artists.find(
    (a) => a.isLabelProfile
  );
  if (!labelArtist) {
    return null;
  }
  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        p {
          margin-bottom: 0.5rem;
          display: inline-block;
        }

        a {
          display: inline-flex;
        }
      `}
    >
      <p>
        <Trans
          t={t}
          i18nKey="inviteToJoinLabel"
          components={{
            linkToLabel: (
              <Link
                to={getArtistUrl(labelArtist)}
                className={css({ fontWeight: "bold" })}
              ></Link>
            ),
          }}
          values={{ labelName: labelArtist.name }}
        />
      </p>
      <p>
        {t("manageOnArtistPage")}{" "}
        <ButtonLink
          endIcon={<FaChevronRight />}
          variant="link"
          size="compact"
          to={getArtistManageUrl(notification.artist.id) + "/customize#labels"}
        >
          {notification.artist?.name}
        </ButtonLink>
      </p>
    </div>
  );
};

export default LabelInvite;
