import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import ClickToPlayAlbum from "../common/ClickToPlayAlbum";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import Button from "../common/Button";
import usePublicObjectById from "utils/usePublicObjectById";
import { useTranslation } from "react-i18next";
import ArtistSupport from "components/Artist/ArtistSupport";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PublicTrackGroupListing from "components/common/PublicTrackGroupListing";
import { MetaCard } from "components/common/MetaCard";
import { useArtistContext } from "state/ArtistContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";
import { bp } from "../../constants";
import DropdownMenu from "components/common/DropdownMenu";
import TrackGroupAdminMenu from "./TrackGroupAdminMenu";
import MarkdownContent from "components/common/MarkdownContent";
import Wishlist from "./Wishlist";

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    state: { artist, isLoading: isLoadingArtist, userStripeStatus },
  } = useArtistContext();
  const { artistId, trackGroupId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

  const { object: trackGroup, isLoadingObject: isLoadingTrackGroup } =
    usePublicObjectById<TrackGroup>(
      "trackGroups",
      trackGroupId,
      `?artistId=${artistId}`
    );

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  if (!trackGroup && !isLoadingTrackGroup) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!trackGroup) {
    return <FullPageLoadingSpinner />;
  }

  const ownedByUser = artist.userId === user?.id;

  const trackGroupCredits = trackGroup.credits;

  return (
    <div
      className={css`
        ${
          !user
            ? `
            min-height: calc(100vh - 70px);
            margin-top: 0vh;`
            : `
            min-height: calc(100vh - 130px);
            margin-top: 1rem;`
        }
        display: flex;
        align-items: center;
        width: 100%;

        @media screen and (max-width: ${bp.small}px) {
          margin-top: 0rem;
      `}
    >
      <MetaCard
        title={trackGroup.title}
        description={trackGroup.about ?? "An album on Mirlo"}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <div
        className={css`
          width: 100%;
          align-items: center;

          td {
            padding: 0rem 0.4rem 0rem 0rem !important;
            margin: 0.1rem 0rem !important;
          }

          a {
            color: ${artist.properties?.colors.primary};
          }

          @media screen and (max-width: ${bp.small}px) {
            td {
              padding: 0.2rem 0.1rem 0.2rem 0rem !important;
            }
          }
        `}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
            justify-content: center;

            @media screen and (max-width: ${bp.small}px) {
              padding-top: 0px;
            }
          `}
        >
          <div>
            <div
              className={css`
                display: flex;
                margin-top: 1rem;
                margin-bottom: 0.5rem;
                align-items: center;
                justify-content: flex-start;
                align-items: center;
              `}
            >
              <div
                className={css`
                  @media screen and (max-width: ${bp.small}px) {
                    display: none;
                  }
                `}
              >
                <ClickToPlayAlbum
                  trackGroupId={trackGroup.id}
                  className={css`
                    width: 50px !important;
                    margin-right: 10px;
                  `}
                />
              </div>
              <div>
                <h1
                  className={css`
                    font-size: 2rem;
                    line-height: 2.2rem;
                  `}
                >
                  {trackGroup.title}
                </h1>
              </div>
            </div>
          </div>

          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 0.6rem;
            `}
          >
            <div>
              {artist && (
                <em
                  className={css`
                    font-size: 18px;
                    font-style: normal;
                  `}
                >
                  by{" "}
                  <Link to={`/${artist.urlSlug?.toLowerCase() ?? artist.id}`}>
                    {artist?.name}
                  </Link>
                </em>
              )}
            </div>
            <div
              className={css`
                text-align: right;
                display: flex;
                align-items: center;
              `}
            >
              {ownedByUser && (
                <Link
                  to={`/manage/artists/${artist.id}/release/${trackGroup.id}`}
                  style={{ marginRight: "1rem" }}
                >
                  <Button compact startIcon={<FaPen />}>
                    {t("edit")}
                  </Button>
                </Link>
              )}
              {user?.isAdmin && (
                <div
                  className={css`
                    padding-left: 1rem;
                  `}
                >
                  <DropdownMenu compact>
                    <TrackGroupAdminMenu trackGroup={trackGroup} />
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>

          <div
            className={css`
              display: flex;
              justify-content: space-between;
              flex-wrap: nowrap;

              @media screen and (max-width: ${bp.small}px) {
                flex-direction: column;
              }
            `}
          >
            <div
              className={css`
                display: flex;
                flex: 45%;
                max-width: 45%;
                flex-direction: column;

                @media screen and (max-width: ${bp.small}px) {
                  flex: 100%;
                  max-width: 100%;
                  width: 100%;
                  min-width: 100%;
                  flex-direction: column;
                }
              `}
            >
              <div
                className={css`
                  border: 1px solid rgba(255, 255, 255, 0.05);
                `}
              >
                <ImageWithPlaceholder
                  src={trackGroup.cover?.sizes?.[960]}
                  alt={trackGroup.title}
                  size={960}
                />
              </div>
              <div
                className={css`
                  margin-top: 0.5rem;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                `}
              >
                <div
                  className={css`
                    color: var(--mi-light-foreground-color);
                    font-size: 1rem;
                    height: 1.5rem;
                    em {
                      font-style: normal;
                    }

                    @media screen and (max-width: ${bp.medium}px) {
                      font-size: var(--mi-font-size-small);
                    }
                  `}
                >
                  {t("released")}{" "}
                  <em>
                    {new Date(trackGroup.releaseDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </em>
                </div>
                <div
                  className={css`
                    display: flex;
                    button {
                      margin-left: 0.5rem;
                      background: var(--mi-darken-background-color);
                      );
                    }
                  `}
                >
                  <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
                  <Wishlist trackGroup={trackGroup} />
                </div>
              </div>
              <div
                className={css`
                  margin-bottom: 0.5rem;
                  @media screen and (min-width: ${bp.small}px) {
                    display: none;
                  }
                `}
              >
                <ClickToPlayAlbum
                  trackGroupId={trackGroup.id}
                  className={css`
                    width: 50px !important;
                    margin-right: 10px;
                  `}
                />
              </div>
            </div>
            <div
              className={css`
                max-width: 59%;
                flex: 59%;
                @media screen and (max-width: ${bp.small}px) {
                  max-width: 100%;
                  flex: 100%;
                  margin-left: 0;
                }
              `}
            >
              <PublicTrackGroupListing
                tracks={trackGroup.tracks}
                trackGroup={trackGroup}
              />
            </div>
          </div>
        </div>
        <div
          className={css`
            display: flex;
            justify-content: space-between;
            @media screen and (max-width: ${bp.small}px) {
              flex-direction: column;
            }
          `}
        >
          <div
            className={css`
              max-width: 70%;
              margin: 1.25rem 0 1.25rem;
              padding: 0.5rem 2rem 0.25rem 0rem;
              @media screen and (max-width: ${bp.small}px) {
                max-width: 100%;
                padding: 0.5rem 0rem 0.25rem 0rem;
                border-right: 0;
              }
            `}
          >
            <MarkdownContent content={trackGroup.about} />
          </div>

          <div
            className={css`
              margin: 1.25rem 0;
              padding: 0.5rem 0.25rem 0.5rem 2rem;
              font-size: var(--mi-font-size-small);
              opacity: 0.5;
              ${trackGroupCredits ? "border-left: 1px solid;" : ""}
              @media screen and (max-width: ${bp.small}px) {
                max-width: 100%;
                padding: 0.5rem 0.25rem 0.5rem 0rem;
                border-left: 0;
              }
            `}
          >
            <MarkdownContent content={trackGroup.credits} />
          </div>
        </div>
        {userStripeStatus?.chargesEnabled && <ArtistSupport artist={artist} />}
      </div>
    </div>
  );
}

export default TrackGroup;
