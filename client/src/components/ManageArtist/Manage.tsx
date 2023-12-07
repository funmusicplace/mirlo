import { css } from "@emotion/css";
import React from "react";

import api from "services/api";
import Button from "../common/Button";
import CreateNewArtistForm from "./ArtistForm";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import { Link } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import CountrySelect from "./CountrySelectForm";

export const Manage: React.FC = () => {
  const { state } = useGlobalStateContext();
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [stripeAccountStatus, setStripeAccountStatus] =
    React.useState<AccountStatus>();
  const [creatingNewArtist, setCreatingNewArtist] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = state.user?.id;

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

  const setUpBankAccount = React.useCallback(async () => {
    try {
      window.location.assign(api.root + `users/${userId}/stripe/connect`);
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [snackbar, t, userId]);

  React.useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  return (
    <>
      <div
        className={css`
          display: flex;
          flex-direction: column;
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
        <h1 className={css``}>{t("manageArtists")}</h1>

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
            <Link
              key={a.id}
              to={`artists/${a.id}`}
              className={css`
                margin-right: 1rem;
                margin-bottom: 1rem;
              `}
            >
              <Button variant="outlined">{a.name}</Button>
            </Link>
          ))}
          <Button
            onClick={() => {
              setCreatingNewArtist(true);
            }}
            className={css`
              flex-grow: 1;
              text-align: center;
              border-radius: 6px;
              justify-self: none;
            `}
          >
            {t("createNewArtist")}
          </Button>
          <CreateNewArtistForm
            open={creatingNewArtist}
            onClose={() => setCreatingNewArtist(false)}
            reload={fetchArtists}
          />
        </div>
        <div
          className={css`
            margin-top: 1rem;
          `}
        >
          <h2>Payment management</h2>
          <CountrySelect />
          <Box variant="info">
            {!stripeAccountStatus?.chargesEnabled &&
              t("waitingStripeAccountVerification")}
            {stripeAccountStatus?.chargesEnabled && t("stripeAccountVerified")}
          </Box>
          <Button onClick={setUpBankAccount}>
            {stripeAccountStatus?.detailsSubmitted
              ? t("updateBankAccount")
              : t("setUpBankAccount")}
          </Button>
        </div>
      </div>
    </>
  );
};

export default Manage;
