import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "components/common/Button";
import StripeStatus from "components/common/stripe/StripeStatusAndButton";
import WidthContainer from "components/common/WidthContainer";
import ArtistInvites from "components/ManageArtist/ArtistInvites";
import { queryManagedArtists } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";

import { bp } from "../../constants";

export const Index: React.FC = () => {
  const { user } = useAuthContext();
  const { data: { results: artists = [] } = {} } = useQuery({
    ...queryManagedArtists(),
    enabled: !!user,
  });

  const { t } = useTranslation("translation", { keyPrefix: "manage" });

  const ownedArtists = artists.filter(
    (a) => !a.isLabelProfile && a.relationship === "owner"
  );
  const sharedArtists = artists.filter(
    (a) => !a.isLabelProfile && a.relationship === "manager"
  );

  return (
    <>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          padding: 1rem;
          button {
            margin-top: 0 !important;
          }
          @media screen and (max-width: ${bp.medium}px) {
            padding: var(--mi-side-paddings-xsmall);
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
          }
        `}
      >
        <WidthContainer variant="medium" justify="center">
          <div className="flex justify-between items-center gap-1">
            <h1 className={css``}>{t("manageArtists")}</h1>
            <ButtonLink
              to="/manage/bulk-track-upload"
              variant="outlined"
              size="compact"
            >
              Add from CSV
            </ButtonLink>
          </div>
          <ArtistInvites />

          <div
            className={css`
              display: flex;
              flex-direction: column;
            `}
          >
            <div
              className={css`
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: stretch;
                margin-top: 1rem;
                flex-wrap: wrap;
                gap: 1rem;
              `}
            >
              {ownedArtists.map((a) => (
                <ButtonLink
                  key={a.id}
                  to={`artists/${a.id}`}
                  variant="outlined"
                >
                  {a.name}
                </ButtonLink>
              ))}
              <ButtonLink
                wrap
                to="/manage/welcome"
                buttonRole="primary"
                startIcon={<FaPlus />}
                className={css`
                  text-align: center;
                  border-radius: 6px;
                  justify-self: none;
                `}
              >
                {t("createNewArtist")}
              </ButtonLink>
            </div>
          </div>
          {sharedArtists.length > 0 && (
            <section className="mt-8">
              <h2>{t("sharedWithYou")}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                {sharedArtists.map((a) => (
                  <ButtonLink
                    key={a.id}
                    to={`artists/${a.id}`}
                    variant="outlined"
                  >
                    {a.name}
                  </ButtonLink>
                ))}
              </div>
            </section>
          )}
          <div
            className={css`
              margin-top: 3rem;
            `}
          >
            <h2>{t("managePayment")}</h2>
            <StripeStatus />
          </div>
        </WidthContainer>
      </div>
    </>
  );
};

export default Index;
