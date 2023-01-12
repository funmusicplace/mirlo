import { css } from "@emotion/css";
import React from "react";

import BackButton from "../common/BackButton";
import api from "services/api";
import Button from "../common/Button";
import CreateNewArtistForm from "./ArtistForm";
import ArtistListItem from "./ArtistListItem";
import { useGlobalStateContext } from "state/GlobalState";

export const Manage: React.FC = () => {
  const { state } = useGlobalStateContext();
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [creatingNewArtist, setCreatingNewArtist] = React.useState(false);

  const userId = state.user?.id;

  const fetchArtists = React.useCallback(async () => {
    if (userId) {
      const fetchedArtists = await api.get<Paginated<Artist>>(
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
          padding: 0 1rem;
        `}
      >
        <BackButton />

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
          <h2 className={css``}>Manage</h2>
          <Button
            onClick={() => {
              setCreatingNewArtist(true);
            }}
            style={{ marginTop: "1rem" }}
          >
            Create new artist
          </Button>
          <CreateNewArtistForm
            open={creatingNewArtist}
            onClose={() => setCreatingNewArtist(false)}
            reload={fetchArtists}
          />
        </div>
        <h3>Your artists</h3>

        {artists.map((a) => (
          <ArtistListItem artist={a} key={a.id} reload={fetchArtists} />
        ))}
      </div>
    </>
  );
};

export default Manage;
