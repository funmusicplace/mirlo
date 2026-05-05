import NextButton from "components/common/NextButton";
import PrevButton from "components/common/PrevButton";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";
import React from "react";
import { useTranslation } from "react-i18next";

import { PlayButtonsWrapper } from "../../PlayButtonsWrapper";
import TrackGroupTitleContent from "../../TrackGroupTitleContent";
import {
  ElapsedTime,
  TrackListWrapper,
  WidgetActionsCorner,
  WidgetPlayerBar,
  WidgetWrapper,
} from "../../utils";
import { useTrackGroupWidgetData } from "../useTrackGroupWidgetData";

const TRACKLIST_MIN_HEIGHT = 200;

const Card = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    trackGroup,
    artist,
    isLoading,
    currentTrack,
    currentSeconds,
    setCurrentSeconds,
    elapsedSeconds,
    embeddedInMirlo,
    playableTracks,
  } = useTrackGroupWidgetData();

  const [hasRoomForTracklist, setHasRoomForTracklist] = React.useState(true);

  React.useEffect(() => {
    const check = () =>
      setHasRoomForTracklist(window.innerHeight > TRACKLIST_MIN_HEIGHT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if ((!trackGroup || !trackGroup.id) && !isLoading) {
    return (
      <div
        className={`[border:var(--mi-border)] flex w-full justify-center p-4 ${
          embeddedInMirlo ? "min-h-[200px]" : ""
        }`}
      >
        {t("trackDoesntExist")}
      </div>
    );
  }

  if (!trackGroup) {
    return null;
  }

  const bgColor =
    artist?.properties?.colors?.background ?? "var(--mi-background-color)";

  const titleContent = (
    <TrackGroupTitleContent
      trackGroup={trackGroup}
      currentTrack={currentTrack}
      embeddedInMirlo={embeddedInMirlo}
    />
  );

  return (
    <WidgetWrapper
      artistColors={artist?.properties?.colors}
      embeddedInMirlo={embeddedInMirlo}
      className="h-screen w-screen relative [&_a]:no-underline!"
    >
      {trackGroup.cover?.sizes?.[600] ? (
        <img
          src={trackGroup.cover.sizes[600]}
          alt={trackGroup.title ?? "Untitled release"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-(--mi-darken-background-color)" />
      )}

      <div className="w-2/5 max-xs:w-[30%] h-full relative shrink-0" />

      <div
        className={`absolute left-[40%] max-xs:left-[30%] -translate-x-1/2 -translate-y-1/2 z-10 ${
          hasRoomForTracklist ? "top-16" : "top-[calc(50%-0.5rem)]"
        }`}
      >
        <PlayButtonsWrapper ids={playableTracks?.map((t) => t.id) ?? []} />
      </div>

      <div
        className="flex-1 min-w-0 overflow-hidden flex flex-col relative"
        style={{
          background: `linear-gradient(to right, color-mix(in srgb, ${bgColor} 70%, transparent) 0%, ${bgColor} 80%)`,
        }}
      >
        {hasRoomForTracklist ? (
          <>
            <div className="shrink-0 flex items-center min-h-[8rem] pl-8 pr-4 gap-3 relative">
              <div className="flex-1 min-w-0 flex flex-col">{titleContent}</div>
              <WidgetActionsCorner artist={artist} trackGroup={trackGroup} />
              {trackGroup.tracks.length > 1 && (
                <div className="flex absolute bottom-1 left-8 gap-1 items-center">
                  {currentTrack && (
                    <ElapsedTime
                      current={elapsedSeconds}
                      total={currentTrack.audio?.duration}
                      className="opacity-85 text-xs max-xs:text-[0.65rem]"
                    />
                  )}
                  <PrevButton compact />
                  <NextButton compact />
                </div>
              )}
            </div>

            <div
              className="flex-1 min-h-0 flex flex-col overflow-hidden border-t border-current/20 relative mb-4"
              style={{
                maskImage:
                  "linear-gradient(to bottom, black 0%, black calc(100% - 2rem), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black calc(100% - 2rem), transparent 100%)",
              }}
            >
              <TrackListWrapper id="trackgroup-card-tracks-scroll">
                <PublicTrackGroupListing
                  size="small"
                  showDropdown={false}
                  tracks={trackGroup.tracks}
                  trackGroup={trackGroup}
                  inWidget
                />
              </TrackListWrapper>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex pt-4 pl-8 pr-4 pb-8 gap-3 relative">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {titleContent}
            </div>
            <WidgetActionsCorner artist={artist} trackGroup={trackGroup} />
            {trackGroup.tracks.length > 1 && (
              <div className="flex absolute bottom-6 left-8 gap-1 items-center">
                {currentTrack && (
                  <ElapsedTime
                    current={elapsedSeconds}
                    total={currentTrack.audio?.duration}
                    className="opacity-85 text-xs max-xs:text-[0.65rem]"
                  />
                )}
                <PrevButton compact />
                <NextButton compact />
              </div>
            )}
          </div>
        )}

        <WidgetPlayerBar
          currentTrack={currentTrack}
          embeddedInMirlo={embeddedInMirlo}
          currentSeconds={currentSeconds}
          setCurrentSeconds={setCurrentSeconds}
        />
      </div>
    </WidgetWrapper>
  );
};

export default Card;
