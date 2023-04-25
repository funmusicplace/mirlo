import { css } from "@emotion/css";
import React from "react";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import Button from "../common/Button";
import PostContent from "../common/PostContent";
import ArtistAlbums from "./ArtistAlbums";
import usePublicArtist from "utils/usePublicArtist";
import { Helmet } from "react-helmet";

function Artist() {
  const { artistId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

  const { artist } = usePublicArtist(artistId);

  if (!artist) {
    return (
      <Box>
        This artist does not exist or it does not have a public presence
      </Box>
    );
  }

  const ownedByUser = artist.userId === user?.id;

  return (
    <div>
      <Helmet>
        <title>Mirlo: {artist.name}</title>
        <meta name="description" content={`${artist.name}: ${artist.bio}`} />
      </Helmet>
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
