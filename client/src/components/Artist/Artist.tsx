import { css } from "@emotion/css";
import React from "react";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import api from "../../services/api";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import Button from "../common/Button";
import PostContent from "../common/PostContent";
import ArtistAlbums from "./ArtistAlbums";

function Artist() {
  const { artistId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();
  const [artist, setArtist] = React.useState<Artist>();

  const fetchArtist = React.useCallback(async () => {
    const { result } = await api.get<Artist>(`artists/${artistId}`);
    setArtist(result);
  }, [artistId]);

  React.useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  if (!artist) {
    return null;
  }

  const ownedByUser = artist.userId === user?.id;

  return (
    <div>
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
        `}
      >
        <h1>{artist.name}</h1>
        {ownedByUser && (
          <Link to={`/manage/artists/${artist.id}`}>
            <Button compact startIcon={<FaPen />}>
              Edit
            </Button>
          </Link>
        )}
      </div>
      <p>{artist.bio}</p>
      <ArtistSupport artist={artist} />
      <ArtistAlbums artist={artist} />
      <h2>Updates</h2>
      <div>
        {artist.posts?.map((p) => (
          <Box
            key={p.id}
            className={css`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding-top: 1.5rem;

              &:not(:first-child) {
                border-top: 1px solid #efefef;
              }
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;
              `}
            >
              <h3>{p.title}</h3>
            </div>
            <PostContent content={p.content} />
          </Box>
        ))}
      </div>
    </div>
  );
}

export default Artist;
