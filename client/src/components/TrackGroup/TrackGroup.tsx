import { css } from "@emotion/css";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import Button from "../common/Button";
import usePublicObjectById from "utils/usePublicObjectById";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import ArtistSupport from "components/Artist/ArtistSupport";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PublicTrackGroupListing from "components/common/PublicTrackGroupListing";
import { MetaCard } from "components/common/MetaCard";

function TrackGroup() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { artistId, trackGroupId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

  const { object: artist, isLoadingObject: isLoadingArtist } =
    usePublicObjectById<Artist>("artists", artistId);

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
        {ownedByUser && (
          <Link to={`/manage/artists/${artist.id}`}>
            <Button compact startIcon={<FaPen />}>
              {t("edit")}
            </Button>
          </Link>
        )}
      </div>
      <ArtistTrackGroup trackGroup={trackGroup} artist={artist} />
      <PublicTrackGroupListing
        tracks={trackGroup.tracks}
        trackGroup={trackGroup}
      />
      <ArtistSupport artist={artist} />
    </div>
  );
}

export default TrackGroup;
