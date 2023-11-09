import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import Button from "../common/Button";
import usePublicObjectById from "utils/usePublicObjectById";
import { useTranslation } from "react-i18next";
import ArtistSupport from "components/Artist/ArtistSupport";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PublicTrackGroupListing from "components/common/PublicTrackGroupListing";
import { MetaCard } from "components/common/MetaCard";
import ReactMarkdown from "react-markdown";
import { useArtistContext } from "state/ArtistContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";
import { bp } from "../../constants";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import DropdownMenu from "components/common/DropdownMenu";
import TrackGroupAdminMenu from "./TrackGroupAdminMenu";

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

  const ownedByUser = artist.userId === user?.id;

  if (!artist && !isLoadingArtist) {
    console.log("no artist");
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  if (!trackGroup && !isLoadingTrackGroup) {
    console.log("no trackgroup");
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!trackGroup) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <div
      className={css`
        ${
          !user
            ? `
            min-height: calc(100vh - 70px);
            margin-top: 3vh;`
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
        image={trackGroup.cover?.sizes?.[300]}
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
          <div
            className={css`
              display: flex;
              margin-top: 1rem;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 0.5rem;
              align-items: stretch;
            `}
          >
            <div>
              <h1
                className={css`
                  font-size: 32px;
                  line-height: 1;
                  margin-bottom: 0.5rem;
                `}
              >
                {trackGroup.title}
              </h1>
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
                align-items: flex-start;
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
              <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
              {user?.isAdmin && (
                <DropdownMenu>
                  <TrackGroupAdminMenu trackGroup={trackGroup} />
                </DropdownMenu>
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
                  color: var(--mi-light-foreground-color);
                  font-size: 16px;
                  em {
                    font-style: normal;
                  }

                  @media screen and (max-width: ${bp.medium}px) {
                    font-size: 14px;
                    margin-bottom: 1rem;
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
            margin: 1.25rem 0;
            border-left: 5px solid var(--mi-lighter-background-color);
            padding: 0.5rem 0.25rem;
          `}
        >
          <MarkdownWrapper>
            <ReactMarkdown>{trackGroup.about}</ReactMarkdown>
          </MarkdownWrapper>
        </div>
        {userStripeStatus?.chargesEnabled && <ArtistSupport artist={artist} />}
      </div>
    </div>
  );
}

export default TrackGroup;
