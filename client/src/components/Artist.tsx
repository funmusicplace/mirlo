import { css } from "@emotion/css";
import React from "react";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import api from "../services/api";
import Box from "./common/Box";
import Button from "./common/Button";
import ClickToPlay from "./common/ClickToPlay";
import SmallTileDetails from "./common/LargeTileDetail";
import Money from "./common/Money";
import PostContent from "./common/PostContent";

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
      <h2>Support Artist</h2>
      <div>
        {artist.subscriptionTiers?.map((p) => (
          <div
            key={p.id}
            className={css`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding-top: 1.5rem;
              display: flex;
              flex-direction: column;

              &:not(:first-child) {
                border-top: 1px solid #efefef;
              }
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;

                h3 {
                  font-size: 1.2rem;
                }
              `}
            >
              <h3>{p.name}</h3>
              <Money amount={p.minAmount} />
            </div>
            <p>{p.description}</p>
            <div
              className={css`
                margin-top: 0.5rem;
              `}
            >
              {!ownedByUser && (
                <Button compact>
                  Support at <Money amount={p.minAmount} /> / month
                </Button>
              )}
              {ownedByUser && (
                <Box
                  className={css`
                    text-align: center;
                  `}
                >
                  Users will be able to subscribe here
                </Box>
              )}
            </div>
          </div>
        ))}
      </div>
      <h2>Albums</h2>
      {artist.trackGroups?.map((trackGroup) => (
        <div
          key={trackGroup.id}
          className={css`
            margin-bottom: 1rem;
            border-top: 1px solid #efefef;
            margin-top: 1rem;
            padding-top: 1.5rem;
          `}
        >
          <div
            className={css`
              display: flex;

              & > :first-child {
                margin-right: 0.5rem;
              }
            `}
          >
            <ClickToPlay
              image={{
                width: 120,
                height: 120,
                url: trackGroup.cover?.sizes?.[120] ?? "",
              }}
              trackGroupId={trackGroup.id}
              title={trackGroup.title}
            />
            <SmallTileDetails
              title={trackGroup.title}
              subtitle={`Released: ${trackGroup.releaseDate.split("T")[0]}`}
            />
          </div>
        </div>
      ))}
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
