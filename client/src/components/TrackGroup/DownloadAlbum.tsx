import { css } from "@emotion/css";

import { Navigate, useParams, useSearchParams } from "react-router-dom";

import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import { useArtistContext } from "state/ArtistContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import { WidthWrapper } from "components/common/WidthContainer";

import SmallTileDetails from "components/common/SmallTileDetails";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import React from "react";
import api from "services/api";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

function DownloadAlbum() {
  const [trackGroup, setTrackGroup] = React.useState<TrackGroup>();
  const [isOwned, setIsOwned] = React.useState(false);
  const [isLoadingTrackGroup, setIsLoadingTrackGroup] = React.useState(true);
  const [params] = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const { trackGroupId, artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  React.useEffect(() => {
    const callback = async () => {
      try {
        setIsLoadingTrackGroup(true);
        // We need to find the trackgroup id, not the slug
        const tgResponse = await api.get<TrackGroup>(
          `trackGroups/${trackGroupId}?artistId=${artistId}`
        );

        const result = await api.get<{ exists: boolean }>(
          `trackGroups/${tgResponse.result.id}/testOwns?email=${email ?? ""}`
        );

        if (result.result.exists) {
          setIsOwned(true);

          if (result.result) {
            setTrackGroup(tgResponse.result);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingTrackGroup(false);
      }
    };
    if (artistId) {
      callback();
    }
  }, [artistId, email, trackGroupId]);

  if (!artist && !isLoadingArtist) {
    return <Navigate to="/" replace />;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  } else if (artist && !isOwned && !isLoadingTrackGroup) {
    return (
      <Navigate
        to={getReleaseUrl(artist, {
          urlSlug: trackGroupId,
          id: Number(trackGroupId),
        })}
        replace
      />
    );
  } else if (!trackGroup && !isLoadingTrackGroup) {
    return <Navigate to={getArtistUrl(artist)} replace />;
  } else if (!trackGroup) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthWrapper variant="small">
      <MetaCard
        title={trackGroup.title}
        description={trackGroup.about ?? "An album on Mirlo"}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <div
        className={css`
          margin-top: 2rem;
        `}
      >
        <h2>Download your new album!</h2>
        <div
          className={css`
            display: flex;
            margin-bottom: 1rem;
          `}
        >
          <ImageWithPlaceholder
            src={trackGroup.cover?.sizes?.[120]}
            size={120}
            alt={trackGroup.title}
          />
          <SmallTileDetails
            title={trackGroup.title}
            subtitle={trackGroup.artist?.name ?? ""}
          />
        </div>
        <DownloadAlbumButton
          trackGroup={trackGroup}
          token={token ?? undefined}
          email={email ?? undefined}
        />
      </div>
    </WidthWrapper>
  );
}

export default DownloadAlbum;
