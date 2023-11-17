import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import ArtistAlbums from "./ArtistAlbums";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";

export const ArtistSection = styled.div`

  background: var(--mi-light-background-color);
  margin-bottom: 2rem;
  @media screen and (max-width: ${bp.medium}px) {
    padding: 0.5rem !important;
  }

`;

function Artist() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { artist, isLoading },
  } = useArtistContext();

  if (!artist && !isLoading) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <>
      <ArtistAlbums artist={artist} />
      <ArtistSection>
        <ArtistSupport artist={artist} />
      </ArtistSection>
      <ArtistSection>
      <div
      className={css`
        padding-bottom: 1.5rem;
        padding: 1rem 0rem;
        @media screen and (max-width: ${bp.medium}px) {
          padding: 0.5rem !important;
        }
      `}
    >
        <h2
        className={css`
          margin-bottom: 0rem;
        `}
        >{t("updates")}</h2>
      <div className={css`
        display: flex;
        flex-direction: column;
        align-items: center;

        @media screen and (max-width: ${bp.medium}px) {
          padding: 0rem !important;
          background: var(--mi-light-background-color);
        }

      `}>


        <div
        className={css`
          padding-bottom: .7rem;
          }
        `}>{artist.posts?.length === 0 && <>{t("noUpdates")}</>}</div>
        {artist.posts?.map((p) => (
          <Link to={`/post/${p.id}/`}
          className={css`
            width: 100%;
            `}
          >
          <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 0 0 2rem 0;
            width: 100%;
            overflow: hidden;
            white-space: ellipsis;
            outline: solid 1px grey;
            transition: .2s ease-in-out;
            background-color: var(--mi-light-background-color);

            > :last-child {
              color: var(--mi-primary-color) !important;
              background: var(--mi-secondary-color);
            }

            :hover {
              background-color: var(--mi-darken-background-color);
              transition: .2s ease-in-out;
              > :last-child {
                background: var(--mi-primary-color);
                color: var(--mi-secondary-color) !important;
              }

            }

            @media screen and (max-width: ${bp.medium}px) {
              padding: 0rem !important;}
            `}
          >

          <Box
            key={p.id}
            className={css`
              border-bottom: solid 1px grey;
              margin-bottom: 0rem !important;
              @media screen and (max-width: ${bp.medium}px) {
                width: 100% !important;
                padding: 2rem 2rem !important;
              }
              @media screen and (max-width: ${bp.small}px) {
                padding: 1rem 1rem !important;
                font-size: .875rem !important;
              }
            `}
          >
            <div
              className={css`
                padding-bottom: 0rem;
              `}
            >
              {/* <h5>{p.title}</h5> */}

              <h4
                className={css`
                  padding-bottom: .5rem;
                `}
              >
                <Link to={`/post/${p.id}/`}
                  className={css`
                    font-weight: normal;
                    text-align: center;
                  `}
                >{p.title}</Link>
              </h4>
              {p.artist && (
                <em>
                  by{" "}
                  <Link to={`/${p.artist.urlSlug ?? p.artist.id}`}>
                    {p.artist?.name}
                  </Link>
                </em>
              )}
              <span
                className={css`
                  color: grey;
                `}
              >
                {new Date(p.publishedAt).toLocaleDateString(
                  "en-US",
                  {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                )}

              </span>
            </div>

            <div>
            <span
              className={css`
                white-space: nowrap;
                display:block;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--mi-normal-foreground-color);
              `}
            >
             {/* <MarkdownContent content={p.content} />*/}
             {p.content}
            </span></div>
          </Box>
          <div
            className={css`
              color: var(--mi-normal-background-color) !important;
              text-align: center;
              width: 100%;
              height: 100%;
              transition: .2s ease-in-out;
            `}
          >read more</div>
          </div>
          </Link>
        ))}
        </div>
      </div>
      </ArtistSection>
    </>
  );
}

export default Artist;
