import { css } from "@emotion/css";
import React from "react";

import api from "services/api";
import { ButtonLink } from "../common/Button";
import { bp } from "../../constants";
import { useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";

import { FaPlus } from "react-icons/fa";
import StripeStatus from "components/common/stripe/StripeStatusAndButton";

export const Manage: React.FC = () => {
  const { user } = useAuthContext();
  const [artists, setArtists] = React.useState<Artist[]>([]);

  const { t } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = user?.id;

  const fetchArtists = React.useCallback(async () => {
    if (userId) {
      const fetchedArtists = await api.getMany<Artist>(`manage/artists`);
      if (fetchedArtists) {
        setArtists(fetchedArtists.results);
      }
    }
  }, [userId]);

  React.useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

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
              to="/manage/bulkTrackUpload"
              variant="outlined"
              size="compact"
            >
              Add from CSV
            </ButtonLink>
          </div>

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
              {artists
                .filter((a) => !a.isLabelProfile)
                .map((a) => (
                  <ButtonLink
                    key={a.id}
                    to={`artists/${a.id}`}
                    variant="outlined"
                  >
                    {a.name}
                  </ButtonLink>
                ))}
              <ButtonLink
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

export default Manage;
