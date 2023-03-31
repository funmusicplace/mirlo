import { css } from "@emotion/css";
import React from "react";

import api from "services/api";
import Button from "../common/Button";
import CreateNewArtistForm from "./ArtistForm";
import { useGlobalStateContext } from "state/GlobalState";
import { Link } from "react-router-dom";
import { theme } from "utils/theme";

export const Manage: React.FC = () => {
  const { state } = useGlobalStateContext();
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [creatingNewArtist, setCreatingNewArtist] = React.useState(false);

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
            align-items: center;
            justify-content: space-between;

            button {
              margin-top: 0 !important;
            }
          `}
        >
          <h2 className={css``}>Manage: Artists</h2>

          <CreateNewArtistForm
            open={creatingNewArtist}
            onClose={() => setCreatingNewArtist(false)}
            reload={fetchArtists}
          />
        </div>

        <div
          className={css`
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: stretch;
            margin-top: 1rem;
          `}
        >
          {artists.map((a) => (
            <Link
              key={a.id}
              to={`artists/${a.id}`}
              className={css`
                flex-grow: 1;
                text-align: center;
                padding: 1rem;
                border: 4px solid ${theme.colors.primaryHighlight};
                margin: 0.25rem;
                border-radius: 6px;
                max-width: 49%;
                line-height: 1;
              `}
            >
              {a.name}
            </Link>
          ))}
          <Button
            onClick={() => {
              setCreatingNewArtist(true);
            }}
            className={css`
              flex-grow: 1;
              text-align: center;
              padding: 1rem;
              margin: 0.25rem;
              border-radius: 6px;
              max-width: 49%;
              border: 4px solid ${theme.colors.primaryHighlight} !important;
            `}
          >
            Create new artist
          </Button>
        </div>
      </div>
    </>
  );
};

export default Manage;
