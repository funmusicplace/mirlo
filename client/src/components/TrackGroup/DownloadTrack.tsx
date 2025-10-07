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
import { useTranslation } from "react-i18next";
import api from "services/api";
import { getArtistUrl, getReleaseUrl, getTrackUrl } from "utils/artist";

function DownloadTrack() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const [track, setTrack] = React.useState<Track>();
  const [isOwned, setIsOwned] = React.useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = React.useState(true);
  const [params] = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const { trackGroupId, artistId, trackId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  React.useEffect(() => {
    const callback = async () => {
      try {
        setIsLoadingTrack(true);
        // We need to find the trackgroup id, not the slug
        const tgResponse = await api.get<Track>(`tracks/${trackId}`);

        const result = await api.get<{ exists: boolean }>(
          `tracks/${trackId}/testOwns?email=${email ?? ""}`
        );

        if (result.result.exists) {
          setIsOwned(true);

          if (result.result) {
            setTrack(tgResponse.result);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingTrack(false);
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
  } else if (artist && !isOwned && !isLoadingTrack) {
    return (
      <Navigate
        to={getTrackUrl(
          artist,
          {
            urlSlug: trackGroupId,
            id: Number(trackGroupId),
          },
          { id: Number(trackId) }
        )}
        replace
      />
    );
  } else if (!track && !isLoadingTrack) {
    return <Navigate to={getArtistUrl(artist)} replace />;
  } else if (!track) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthWrapper variant="small">
      <MetaCard
        title={track.title ?? t("untitledTrack")}
        description={t("trackOnMirlo")}
        image={track.trackGroup.cover?.sizes?.[600]}
      />
      <div
        className={css`
          margin-top: 2rem;
        `}
      >
        <h2>{"downloadYourTrack"}</h2>
        <div
          className={css`
            display: flex;
            margin-bottom: 1rem;
          `}
        >
          <ImageWithPlaceholder
            src={track.trackGroup.cover?.sizes?.[120]}
            size={120}
            alt={track.title ?? t("untitledTrack")}
          />
          <SmallTileDetails
            title={track.title ?? ""}
            subtitle={track.trackGroup.artist?.name ?? ""}
          />
        </div>
        <DownloadAlbumButton
          trackGroup={track.trackGroup}
          track={track}
          token={token ?? undefined}
          email={email ?? undefined}
        />
      </div>
    </WidthWrapper>
  );
}

export default DownloadTrack;
