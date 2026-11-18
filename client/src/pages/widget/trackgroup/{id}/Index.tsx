import {
  TrackGroupWidgetData,
  useTrackGroupWidgetData,
} from "components/Widget/TrackGroupWidget/useTrackGroupWidgetData";
import Card from "components/Widget/TrackGroupWidget/variants/Card";
import Compact from "components/Widget/TrackGroupWidget/variants/Compact";
import Strip from "components/Widget/TrackGroupWidget/variants/Strip";
import { TrackWidgetData } from "components/Widget/TrackWidget/useTrackWidgetData";
import TrackCard from "components/Widget/TrackWidget/variants/Card";
import TrackStrip from "components/Widget/TrackWidget/variants/Strip";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { isSingleTrackRelease } from "utils/tracks";

const variants = {
  card: Card,
  strip: Strip,
  compact: Compact,
} as const;

type VariantKey = keyof typeof variants;

const singleTrackVariants: Record<VariantKey, React.FC<TrackWidgetData>> = {
  card: TrackCard,
  strip: TrackCard,
  compact: TrackStrip,
};

const SingleTrackReleaseWidget: React.FC<
  Pick<
    TrackGroupWidgetData,
    | "artist"
    | "user"
    | "elapsedSeconds"
    | "setCurrentSeconds"
    | "embeddedInMirlo"
  > & { trackGroup: TrackGroup; variant: VariantKey }
> = ({
  trackGroup,
  artist,
  user,
  elapsedSeconds,
  setCurrentSeconds,
  embeddedInMirlo,
  variant,
}) => {
  const track = React.useMemo(
    () => ({ ...trackGroup.tracks[0], trackGroup }),
    [trackGroup]
  );
  const Component = singleTrackVariants[variant];

  return (
    <Component
      track={track}
      artist={artist}
      isLoading={false}
      user={user}
      currentSeconds={elapsedSeconds}
      setCurrentSeconds={setCurrentSeconds}
      embeddedInMirlo={embeddedInMirlo}
    />
  );
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const data = useTrackGroupWidgetData();
  const { trackGroup } = data;

  const requested = searchParams.get("variant");
  const variant: VariantKey =
    requested && requested in variants ? (requested as VariantKey) : "card";

  if (trackGroup && isSingleTrackRelease(trackGroup)) {
    return (
      <SingleTrackReleaseWidget
        trackGroup={trackGroup}
        artist={data.artist}
        user={data.user}
        elapsedSeconds={data.elapsedSeconds}
        setCurrentSeconds={data.setCurrentSeconds}
        embeddedInMirlo={data.embeddedInMirlo}
        variant={variant}
      />
    );
  }

  const Component = variants[variant];
  return <Component {...data} />;
};

export default Index;
