import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import NextButton from "components/common/NextButton";
import PrevButton from "components/common/PrevButton";
import ScrollFadeOverlay from "components/common/ScrollFadeOverlay";
import PublicTrackGroupListing from "components/common/TrackList/PublicTrackGroupListing";
import React from "react";
import { useTranslation } from "react-i18next";

import { PlayButtonsWrapper } from "../../PlayButtonsWrapper";
import TrackGroupTitleContent from "../../TrackGroupTitleContent";
import {
  ElapsedTime,
  TgWidgetWrapper,
  TrackListWrapper,
  WidgetActionsCorner,
  WidgetPlayerBar,
  WidgetWrapper,
} from "../../utils";
import { useTrackGroupWidgetData } from "../useTrackGroupWidgetData";

const Strip: React.FC<{ showTracklist?: boolean }> = ({
  showTracklist = true,
}) => {
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

  const cover = (
    <div
      className={
        showTracklist
          ? "[grid-area:cover] relative sm:aspect-square sm:h-full"
          : "aspect-square h-full relative shrink-0"
      }
    >
      <div className="absolute right-[2.5%] bottom-[2.5%]">
        <PlayButtonsWrapper ids={playableTracks?.map((t) => t.id) ?? []} />
      </div>
      <ImageWithPlaceholder
        src={trackGroup.cover?.sizes?.[600] ?? ""}
        alt=""
        size={600}
        square
        objectFit="cover"
      />
    </div>
  );

  const titleBlock = (
    <div
      className={`${
        showTracklist ? "[grid-area:title]" : "flex-1"
      } min-w-0 border-l border-current/20 flex flex-col relative`}
    >
      <div
        className={`flex-1 min-h-0 flex items-center ${
          showTracklist ? "sm:items-stretch sm:pt-8 sm:pb-8" : ""
        } px-4 gap-2 relative`}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1 max-xs:gap-0 max-sm:mt-2">
          <TrackGroupTitleContent
            trackGroup={trackGroup}
            currentTrack={currentTrack}
            embeddedInMirlo={embeddedInMirlo}
            playingLineEnd={
              trackGroup.tracks.length > 1 && (
                <>
                  {currentTrack && (
                    <ElapsedTime
                      current={elapsedSeconds}
                      total={currentTrack.audio?.duration}
                      className="opacity-85 text-xs max-xs:text-[0.65rem]"
                    />
                  )}
                  <PrevButton compact />
                  <NextButton compact />
                </>
              )
            }
          />
        </div>
        <WidgetActionsCorner artist={artist} trackGroup={trackGroup} />
      </div>
      <WidgetPlayerBar
        currentTrack={currentTrack}
        embeddedInMirlo={embeddedInMirlo}
        currentSeconds={currentSeconds}
        setCurrentSeconds={setCurrentSeconds}
      />
    </div>
  );

  return (
    <WidgetWrapper
      artistColors={artist?.properties?.colors}
      embeddedInMirlo={embeddedInMirlo}
      className="h-screen [&_a]:no-underline!"
    >
      {showTracklist ? (
        <TgWidgetWrapper>
          {cover}
          {titleBlock}
          <div className="[grid-area:tracks] flex flex-col min-h-0 overflow-hidden border-l border-t border-current/20 max-sm:border-l-0 relative">
            <TrackListWrapper id="trackgroup-tracks-scroll">
              <PublicTrackGroupListing
                size="small"
                showDropdown={false}
                tracks={trackGroup.tracks}
                trackGroup={trackGroup}
                inWidget
              />
            </TrackListWrapper>
            <ScrollFadeOverlay
              scrollElementId="trackgroup-tracks-scroll"
              position="bottom"
              fadeColor={
                artist?.properties?.colors?.background ??
                "var(--mi-background-color)"
              }
            />
          </div>
        </TgWidgetWrapper>
      ) : (
        <>
          {cover}
          {titleBlock}
        </>
      )}
    </WidgetWrapper>
  );
};

export default Strip;
