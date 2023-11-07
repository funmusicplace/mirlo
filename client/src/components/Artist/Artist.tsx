import { css } from "@emotion/css";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistSupport from "./ArtistSupport";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import Box from "../common/Box";
import PostContent from "../common/PostContent";
import ArtistAlbums from "./ArtistAlbums";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";

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

  const artistBanner = artist?.banner?.sizes;

  const artistColor = artist?.properties?.colors;

  const artistsectionClass = css`
  padding: 1rem 2rem 1rem 2rem;
  background: var(--mi-light-background-color);
  @media screen and (max-width: ${bp.medium}px) {
    padding: .5rem !important;
    background: var(--mi-light-background-color);
  }
  `;

  return (

    <div
      className={css`
        filter: drop-shadow(0 0 .5rem rgba(50, 50, 50, .3));
        width: 100%;
        min-height: 100vh;
        ${user ? "margin-top: calc(16vh);" : "height: ;"}
        ${!user ? "margin-top: calc(16vh);" : "height: ;"}
        ${!artistBanner ? "margin-top: 0px;" : "height: ;"}
        background: var(--mi-light-background-color);
        max-width: calc(1080px + 4rem);
        //* border-radius: 8px 8px 0 0; *//

        a {
          color: ${artistColor?.primary ? artistColor.primary : "inherit"};
        }

        @media screen and (max-width: ${bp.medium}px) {
          padding: 0rem !important;
          ${user ? "margin-top: 0px;" : "height: ;"}
          ${!user ? "margin-top: 60px;" : "height: ;"}
          ${!artistBanner ? "margin-top: 0px;" : "height: ;"}
        }
      `}
    >
<ArtistHeaderSection artist={artist} />
    {/*  <MetaCard
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
      </MarkdownWrapper>*/}

      <ArtistAlbums artist={artist} />
      <div
        className={artistsectionClass}
      >
      <ArtistSupport artist={artist} />
      </div>
      <div
        className={artistsectionClass}
      >
        <h2>{t("updates")}</h2>

        {artist.posts?.length === 0 && <>{t("noUpdates")}</>}
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
              <h5>{p.title}</h5>
            </div>
            <PostContent content={p.content} />
          </Box>
        ))}
      </div>
    </div>
  );
}

export default Artist;
