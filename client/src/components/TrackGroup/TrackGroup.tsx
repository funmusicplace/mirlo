import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import Button from "../common/Button";
import usePublicObjectById from "utils/usePublicObjectById";
import LoadingSpinner from "components/common/LoadingSpinner";
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

function TrackGroup() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

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

  return (
    <div
      className={css`
        width: 100%;

        a {
          color: ${artist.properties?.colors.primary};
        }
      `}
    >
      <MetaCard
        title={trackGroup.title}
        description={trackGroup.about ?? "An album on Mirlo"}
        image={trackGroup.cover?.sizes?.[300]}
      />
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        `}
      >
        <div>
          <h1
            className={css`
              line-height: 1;
              margin-top: 1rem;
              margin-bottom: 0.5rem;
            `}
          >
            {trackGroup.title}
          </h1>
          {artist && (
            <em>
              by{" "}
              <Link to={`/${artist.urlSlug ?? artist.id}`}>{artist?.name}</Link>
            </em>
          )}
        </div>
        <div
          className={css`
            text-align: right;
          `}
        >
          {ownedByUser && (
            <Link to={`/manage/artists/${artist.id}`}>
              <Button compact startIcon={<FaPen />}>
                {t("edit")}
              </Button>
            </Link>
          )}
          <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
        </div>
      </div>
      <div
        className={css`
          display: flex;
          align-items: flex-start;

          @media screen and (max-width: ${bp.medium}px) {
            flex-direction: column;
          }
        `}
      >
        <ImageWithPlaceholder
          src={trackGroup.cover?.sizes?.[600]}
          alt={trackGroup.title}
          size={600}
        />
        <PublicTrackGroupListing
          tracks={trackGroup.tracks}
          trackGroup={trackGroup}
        />
      </div>
      <div
        className={css`
          margin: 1.25rem 0;
          padding: 0.5rem 0.25rem;
        `}
      >
        <MarkdownWrapper>
          <ReactMarkdown>{trackGroup.about}</ReactMarkdown>
        </MarkdownWrapper>
        <div
          className={css`
            margin-top: 1rem;
            color: #888;
          `}
        >
          Released:{" "}
          <em>
            {new Date(trackGroup.releaseDate).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </em>
        </div>
      </div>
      {userStripeStatus?.chargesEnabled && <ArtistSupport artist={artist} />}
    </div>
  );
}

export default TrackGroup;
