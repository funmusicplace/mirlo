import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Box from "../common/Box";
import Money from "../common/Money";
import Pill from "../common/Pill";
import { useAuthContext } from "state/AuthContext";

const UserSupports: React.FC<{
  artistUserSubscriptions: ArtistUserSubscription[];
}> = ({ artistUserSubscriptions }) => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();

  if (!user) {
    return null;
  }

  return (
    <Box
      className={css`
        margin-top: 1rem;
      `}
    >
      <h2>{t("artistsYouSupport")}</h2>
      {(artistUserSubscriptions?.length ?? 0) > 0 && (
        <ul
          className={css`
            margin-top: 1rem;
            list-style: none;

            li {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 0.5rem;
            }
          `}
        >
          {artistUserSubscriptions?.map((s) => (
            <li>
              <span>
                <strong>
                  <Link
                    to={`/${
                      s.artistSubscriptionTier.artist.urlSlug?.toLowerCase() ??
                      s.artistSubscriptionTier.artistId
                    }`}
                  >
                    {s.artistSubscriptionTier.artist.name}
                  </Link>
                </strong>
                :{" "}
                <Money
                  amount={s.amount / 100}
                  currency={s.artistSubscriptionTier.currency}
                />
                /month
              </span>
              <Pill>tier: {s.artistSubscriptionTier.name}</Pill>
            </li>
          ))}
        </ul>
      )}
      {artistUserSubscriptions?.length === 0 && <>{t("noSubscriptionsYet")}</>}
    </Box>
  );
};

export default UserSupports;
