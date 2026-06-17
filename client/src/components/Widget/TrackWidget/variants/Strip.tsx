import LoadingBlocks from "components/Artist/LoadingBlocks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import React from "react";
import { useTranslation } from "react-i18next";
import { isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";

import { PlayButtonsWrapper } from "../../PlayButtonsWrapper";
import TrackTitleContent from "../../TrackTitleContent";
import {
  ElapsedTime,
  WidgetActionsCorner,
  WidgetPlayerBar,
  WidgetWrapper,
} from "../../utils";
import { useTrackWidgetData } from "../useTrackWidgetData";

const Strip = () => {
  const { t } = useTranslation("translation", { keyPrefix: "trackDetails" });

  const {
    track,
    artist,
    isLoading,
    user,
    currentSeconds,
    setCurrentSeconds,
    embeddedInMirlo,
  } = useTrackWidgetData();

  if (isLoading) {
    return <LoadingBlocks />;
  }

  if (!track || !track.id) {
    return (
      <div className="[border:var(--mi-border)] flex w-full justify-center items-center p-4">
        {t("trackDoesntExist")}
      </div>
    );
  }

  return (
    <WidgetWrapper
      artistColors={artist?.properties?.colors}
      embeddedInMirlo={embeddedInMirlo}
      className="h-screen [&_a]:no-underline!"
    >
      <MetaCard
        title={`${track.title} by ${
          track.trackGroup.artist?.name ?? "Unknown"
        }`}
        description={"A track on Mirlo"}
        image={track.trackGroup.cover?.sizes?.[300]}
        player={widgetUrl(track.id, "track")}
      />
      <div className="aspect-square h-full relative shrink-0">
        {isTrackOwnedOrPreview(track, user) && (
          <div className="absolute right-[2.5%] bottom-[2.5%] sm:hidden">
            <PlayButtonsWrapper ids={[track.id]} />
          </div>
        )}
        <ImageWithPlaceholder
          src={
            track.trackGroup.cover?.sizes?.[600] ??
            track.trackGroup.artist?.avatar?.sizes?.[600] ??
            ""
          }
          alt=""
          size={600}
          square
          objectFit="cover"
        />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden border-l border-current/20 flex flex-col relative">
        <div className="flex-1 min-h-0 flex items-center px-4 gap-2 relative">
          <div className="flex-1 min-w-0 flex flex-col gap-1 max-xs:gap-0 max-sm:mt-2">
            <TrackTitleContent
              track={track}
              embeddedInMirlo={embeddedInMirlo}
              byLineEnd={
                <ElapsedTime
                  current={currentSeconds}
                  total={track.audio?.duration}
                  className="opacity-85 text-xs max-xs:text-[0.65rem]"
                />
              }
            />
          </div>
          <WidgetActionsCorner
            artist={artist}
            trackGroup={track.trackGroup}
            track={track}
          />
          {isTrackOwnedOrPreview(track, user) && (
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <ElapsedTime
                current={currentSeconds}
                total={track.audio?.duration}
                className="text-sm opacity-90"
              />
              <PlayButtonsWrapper ids={[track.id]} />
            </div>
          )}
        </div>
        <WidgetPlayerBar
          currentTrack={track}
          embeddedInMirlo={embeddedInMirlo}
          currentSeconds={currentSeconds}
          setCurrentSeconds={setCurrentSeconds}
        />
      </div>
    </WidgetWrapper>
  );
};

export default Strip;
