import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import SmallTileDetails from "components/common/SmallTileDetails";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import api from "services/api";
import { getArtistUrl, getTrackUrl } from "utils/artist";

function Index() {
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

        const ownsQuery = new URLSearchParams({ email: email ?? "" });
        const result = await api.get<{ exists: boolean }>(
          `tracks/${trackId}/testOwns?${ownsQuery.toString()}`
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
      <WidthWrapper variant="small" className="pt-8 mb-12">
        <div className="flex flex-col items-start gap-4">
          <h1>{t("downloadLinkNotValid")}</h1>
          <p>{t("downloadLinkNotValidHint")}</p>
          <ArtistButtonLink
            to={getTrackUrl(
              artist,
              {
                urlSlug: trackGroupId,
                id: Number(trackGroupId),
              },
              { id: Number(trackId) }
            )}
          >
            {t("goToTrack")}
          </ArtistButtonLink>
        </div>
      </WidthWrapper>
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
            alt=""
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

export default Index;
