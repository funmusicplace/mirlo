import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import WidthContainer from "components/common/WidthContainer";
import SingleTrackView from "components/TrackGroup/SingleTrackView";
import {
  Container,
  ItemViewContentWrapper,
} from "pages/{artistId}/release/{trackGroupId}/Index";
import { queryArtist, queryTrackGroup } from "queries";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getReleaseUrl } from "utils/artist";

function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const navigate = useNavigate();
  const { artistId, trackGroupId, trackId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: trackGroup, isLoading: isLoadingTrackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId ?? "", artistId: artistId ?? "" })
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

  const filteredTrack = trackGroup.tracks.find((t) => t.id === Number(trackId));

  if (!filteredTrack) {
    navigate(getReleaseUrl(artist, trackGroup));
    return null;
  }

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={filteredTrack.title ?? "Untitled track"}
        description={t("trackByArtist", {
          artist: trackGroup.artist?.name ?? "an artist",
        })}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <Container>
        <ItemViewContentWrapper>
          <SingleTrackView
            trackGroup={trackGroup}
            track={filteredTrack}
            artist={artist}
          />
        </ItemViewContentWrapper>
      </Container>
    </WidthContainer>
  );
}

export default Index;
