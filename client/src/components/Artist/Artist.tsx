import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import Button from "../common/Button";
import PostContent from "../common/PostContent";
import ArtistAlbums from "./ArtistAlbums";
import usePublicObjectById from "utils/usePublicObjectById";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    return <FullPageLoadingSpinner />;
  }

  const ownedByUser = artist.userId === user?.id;

  return (
    <div
      className={css`
        width: 100%;
      `}
    >
      <MetaCard
        title={artist.name}
        description={artist.bio}
        image={artist.avatar?.sizes?.[500] ?? artist.banner?.sizes?.[625]}
      />
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
      <ReactMarkdown
        className={css`
          ul {
            margin-left: 1rem;
            margin-bottom: 1rem;
          }
        `}
        remarkPlugins={[remarkGfm]}
      >
        {artist.bio}
      </ReactMarkdown>
      <ArtistSupport artist={artist} />
      <ArtistAlbums artist={artist} />
      <h2>{t("updates")}</h2>
      <div>
        {artist.posts?.length === 0 && <>{t("noUpdates")}</>}
        {artist.posts?.map((p) => (
          <Box
            key={p.id}
            className={css`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding: 0 !important;
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
