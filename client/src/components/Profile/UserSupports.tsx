import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Box from "../common/Box";
import Money, { moneyDisplay } from "../common/Money";
import Pill from "../common/Pill";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";
import { getArtistUrl } from "utils/artist";

const UL = styled.ul`
  margin-top: 1rem;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
`;

const UserSupports: React.FC<{
  artistUserSubscriptions: ArtistUserSubscription[];
}> = ({ artistUserSubscriptions }) => {
  const follows = artistUserSubscriptions.filter(
    (s) => s.artistSubscriptionTier.isDefaultTier
  );
  const notFollows = artistUserSubscriptions.filter(
    (s) => !s.artistSubscriptionTier.isDefaultTier
  );

  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();

  if (!user) {
    return null;
  }

  console.log("notFollows", notFollows);

  return (
    <Box
      className={css`
        margin-top: 1rem;
        padding: 0 !important;
      `}
    >
      <h2>{t("artistsYouSupport")}</h2>
      {(artistUserSubscriptions?.length ?? 0) > 0 && (
        <>
          <UL
            className={css`
              li {
                display: inline-flex !important;
                padding: 1rem 1.2rem;
                background: var(--mi-darken-background-color);
              }
            `}
          >
            {notFollows?.map((s) => (
              <li>
                <Link
                  to={getArtistUrl(s.artistSubscriptionTier.artist)}
                  className={css`
                    display: flex;
                    align-items: center;

                    img {
                      margin-right: 0.5rem;
                    }
                  `}
                >
                  <img
                    src={s.artistSubscriptionTier.artist.avatar?.sizes?.[60]}
                  />
                  <div
                    className={css`
                      display: flex;
                      flex-direction: column;
                    `}
                  >
                    <span>{s.artistSubscriptionTier.artist.name}</span>
                    <span>
                      {moneyDisplay({
                        amount: s.amount,
                        currency: s.artistSubscriptionTier.currency,
                      })}
                      /mo
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </UL>
          <UL>
            {follows?.map((s) => (
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
          </UL>
        </>
      )}
      {artistUserSubscriptions?.length === 0 && <>{t("noSubscriptionsYet")}</>}
    </Box>
  );
};

export default UserSupports;
