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
import usePublicObjectById from "utils/usePublicObjectById";
import { Helmet } from "react-helmet";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useTranslation } from "react-i18next";

function Artist() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { artistId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

  const { object: artist, isLoadingObject: isLoadingArtist } =
    usePublicObjectById<Artist>("artists", artistId);

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return (
      <div
        className={css`
          display: flex;
          height: 100%;
          justify-content: center;
          align-items: center;
          font-size: 4rem;
        `}
      >
        <LoadingSpinner />
      </div>
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
              {t("edit")}
            </Button>
          </Link>
        )}
      </div>
      <p>{artist.bio}</p>
      <ArtistSupport artist={artist} />
      <ArtistAlbums artist={artist} />
      <h2>{t("updates")}</h2>
      <div>
        {artist.posts?.map((p) => (
          <Box
            key={p.id}
            className={css`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding-top: 1.5rem;

              &:not(:first-child) {
                border-top: 1px solid var(--mi-shade-background-color);
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
