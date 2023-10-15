/** @jsxImportSource @emotion/react */
import { css } from "@emotion/css";
import { css as reactCss } from "@emotion/react"
import { FaPen } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import Button from "../common/Button";
import PostContent from "../common/PostContent";
import ArtistAlbums from "./ArtistAlbums";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useArtistContext } from "state/ArtistContext";
import MarkdownWrapper from "components/common/MarkdownWrapper";

function Artist() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { user },
  } = useGlobalStateContext();

  const {
    state: { artist, isLoading },
  } = useArtistContext();

  if (!artist && !isLoading) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  const ownedByUser = artist.userId === user?.id;
  const artistColor = artist?.properties?.colors;

  return (
    <div
      className={css`
        width: 100%;

        a {
          color: ${artistColor?.primary ? artistColor.primary : "inherit"};
        }
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
      <MarkdownWrapper>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{artist.bio}</ReactMarkdown>
      </MarkdownWrapper>
      <ArtistAlbums artist={artist} />
      <ArtistSupport artist={artist} />
      <div
        className={css`
          margin-top: 1rem;
        `}
      >
        <h2>{t("updates")}</h2>

        {artist.posts?.length === 0 && <>{t("noUpdates")}</>}
        {artist.posts?.map((p) => (
          <Box
            key={p.id}
            css={(theme) => reactCss`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding-top: 1.5rem;

              &:not(:first-child) {
                border-top: 1px solid ${theme.colors.translucentShade};
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
