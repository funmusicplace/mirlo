import { css } from "@emotion/css";
import React from "react";

import api from "services/api";
import Button from "../common/Button";
import CreateNewArtistForm from "./ArtistForm";
import { useGlobalStateContext } from "state/GlobalState";
import { Link } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";

export const Manage: React.FC = () => {
  const { state } = useGlobalStateContext();
  const [artists, setArtists] = React.useState<Artist[]>([]);
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
    }
  }, [userId]);

  const setUpBankAccount = React.useCallback(async () => {
    try {
      window.location.assign(api.root + `users/${userId}/connectStripe`);
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
          z-index: 1;
          top: calc(48px + 3rem);
          left: 0;
          overflow-x: hidden;
          padding: 0;
        `}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
            button {
              margin-top: 0 !important;
            }
          `}
        >
          <h2 className={css``}>Manage: Artists</h2>

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
              `}
            >
              Create new artist
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
            <Button onClick={setUpBankAccount}>{t("setUpBankAccount")}</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Manage;
