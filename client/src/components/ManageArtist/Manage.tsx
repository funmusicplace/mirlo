import { css } from "@emotion/css";
import React from "react";

import api from "services/api";
import Button, { ButtonLink } from "../common/Button";
import CreateNewArtistForm from "./ArtistForm";
import { bp } from "../../constants";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import CountrySelect from "./CountrySelectForm";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";

export const Manage: React.FC = () => {
  const { user } = useAuthContext();
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [stripeAccountStatus, setStripeAccountStatus] =
    React.useState<AccountStatus>();
  const [creatingNewArtist, setCreatingNewArtist] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = user?.id;

  const fetchArtists = React.useCallback(async () => {
    if (userId) {
      const fetchedArtists = await api.getMany<Artist>(
        `users/${userId}/artists`
      );
      if (fetchedArtists) {
        setArtists(fetchedArtists.results);
      }

      const checkAccountStatus = await api.get<AccountStatus>(
        `users/${userId}/stripe/checkAccountStatus`
      );
      setStripeAccountStatus(checkAccountStatus.result);
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
          <h1 className={css``}>{t("manageArtists")}</h1>

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
              `}
            >
              {artists.map((a) => (
                <ButtonLink
                  key={a.id}
                  to={`artists/${a.id}`}
                  variant="outlined"
                  className={css`
                    margin-right: 1rem;
                    margin-bottom: 1rem;
                  `}
                >
                  {a.name}
                </ButtonLink>
              ))}
              <div
                className={css`
                  width: 100%;
                `}
              >
                <ButtonLink
                  to="/manage/welcome"
                  variant="big"
                  className={css`
                    flex-grow: 1;
                    text-align: center;
                    border-radius: 6px;
                    justify-self: none;
                  `}
                >
                  {t("createNewArtist")}
                </ButtonLink>
              </div>
            </div>
            <CreateNewArtistForm
              open={creatingNewArtist}
              onClose={() => setCreatingNewArtist(false)}
            />
          </div>
          <div
            className={css`
              margin-top: 3rem;
            `}
          >
            <h2>Payment management</h2>
            <CountrySelect />
            {stripeAccountStatus?.detailsSubmitted && (
              <Box variant="info">
                {!stripeAccountStatus?.chargesEnabled &&
                  stripeAccountStatus?.detailsSubmitted &&
                  t("waitingStripeAccountVerification")}
                {stripeAccountStatus?.chargesEnabled &&
                  t("stripeAccountVerified")}
              </Box>
            )}
            {userId && (
              <a href={api.paymentProcessor.stripeConnect(userId)}>
                <Button variant="big">
                  {stripeAccountStatus?.detailsSubmitted
                    ? t("updateBankAccount")
                    : t("setUpBankAccount")}
                </Button>
              </a>
            )}
          </div>
        </WidthContainer>
      </div>
    </>
  );
};

export default Manage;
