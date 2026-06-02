import { useQuery } from "@tanstack/react-query";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ItemTransactionCard from "components/common/ItemTransactionCard";
import { MetaCard } from "components/common/MetaCard";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import api from "services/api";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

function DownloadAlbum() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const [trackGroup, setTrackGroup] = React.useState<TrackGroup>();
  const [isOwned, setIsOwned] = React.useState(false);
  const [isLoadingTrackGroup, setIsLoadingTrackGroup] = React.useState(true);
  const [params] = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const { trackGroupId, artistId } = useParams();

  const { data: artist, isPending: isLoadingArtist } = useQuery(
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
    <WidthWrapper className="pt-8 mb-12">
      <MetaCard
        title={trackGroup.title ?? t("untitledRelease")}
        description={trackGroup.about ?? t("releaseOnMirlo")}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <ItemTransactionCard
        header={t("downloadYourRelease")}
        cover={trackGroup.cover?.sizes?.[300]}
        coverAlt={trackGroup.title ?? t("untitledRelease").toString()}
        title={trackGroup.title ?? t("untitledRelease").toString()}
        titleLink={getReleaseUrl(artist, trackGroup)}
        artistName={artist.name}
        artistUrl={getArtistUrl(artist)}
      >
        <div className="mt-4">
          <DownloadAlbumButton
            trackGroup={trackGroup}
            token={token ?? undefined}
            email={email ?? undefined}
          />
        </div>
      </ItemTransactionCard>
    </WidthWrapper>
  );
}

export default DownloadAlbum;
