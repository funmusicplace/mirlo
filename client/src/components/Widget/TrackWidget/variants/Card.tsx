import LoadingBlocks from "components/Artist/LoadingBlocks";
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

const HERO_MIN_HEIGHT = 200;

const Card = () => {
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

  const [useHeroLayout, setUseHeroLayout] = React.useState(true);

  React.useEffect(() => {
    const check = () => setUseHeroLayout(window.innerHeight > HERO_MIN_HEIGHT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isLoading) {
    return <LoadingBlocks />;
  }

  if (!track || !track.id) {
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

  const bgColor =
    artist?.properties?.colors?.background || "var(--mi-background-color)";

  const cover =
    track.trackGroup.cover?.sizes?.[600] ??
    track.trackGroup.cover?.sizes?.[300] ??
    track.trackGroup.artist?.avatar?.sizes?.[300];

  return (
    <WidgetWrapper
      artistColors={artist?.properties?.colors}
      embeddedInMirlo={embeddedInMirlo}
      className="h-screen w-screen relative [&_a]:no-underline!"
    >
      <MetaCard
        title={`${track.title} by ${track.trackGroup.artist?.name ?? "Unknown"}`}
        description={"A track on Mirlo"}
        image={track.trackGroup.cover?.sizes?.[300]}
        player={widgetUrl(track.id, "track")}
      />
      {cover ? (
        <img
          src={cover}
          alt={track.trackGroup.coverImageAlt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-(--mi-darken-background-color)" />
      )}

      {useHeroLayout ? (
        <>
          <WidgetActionsCorner
            artist={artist}
            trackGroup={track.trackGroup}
            track={track}
          />

          <div
            className="absolute inset-x-0 bottom-4 px-6 py-3 flex items-center gap-4"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, ${bgColor} 85%, transparent) 0%, ${bgColor} 100%)`,
            }}
          >
            <div className="flex-1 min-w-0">
              <TrackTitleContent
                track={track}
                embeddedInMirlo={embeddedInMirlo}
                combineFromAndBy
                byLineEnd={
                  <ElapsedTime
                    current={currentSeconds}
                    total={track.audio?.duration}
                    className="opacity-70 text-xs max-xs:text-[0.65rem]"
                  />
                }
              />
            </div>
            {isTrackOwnedOrPreview(track, user) && (
              <div className="shrink-0">
                <PlayButtonsWrapper ids={[track.id]} />
              </div>
            )}
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
            style={{ backgroundColor: bgColor }}
          />
          <WidgetPlayerBar
            currentTrack={track}
            embeddedInMirlo={embeddedInMirlo}
            currentSeconds={currentSeconds}
            setCurrentSeconds={setCurrentSeconds}
          />
        </>
      ) : (
        <>
          <div className="w-2/5 max-xs:w-[30%] h-full relative shrink-0" />

          {isTrackOwnedOrPreview(track, user) && (
            <div className="absolute left-[40%] max-xs:left-[30%] -translate-x-1/2 -translate-y-1/2 z-10 top-[calc(50%-0.5rem)]">
              <PlayButtonsWrapper ids={[track.id]} />
            </div>
          )}

          <div
            className="flex-1 min-w-0 overflow-hidden flex flex-col relative"
            style={{
              background: `linear-gradient(to right, color-mix(in srgb, ${bgColor} 70%, transparent) 0%, ${bgColor} 80%)`,
            }}
          >
            <div className="flex-1 min-h-0 flex pt-4 pl-8 pr-4 pb-8 gap-3 relative">
              <div className="flex-1 min-w-0 flex flex-col justify-center sm:pr-[8rem]">
                <TrackTitleContent
                  track={track}
                  embeddedInMirlo={embeddedInMirlo}
                />
              </div>
              <WidgetActionsCorner
                artist={artist}
                trackGroup={track.trackGroup}
                track={track}
              />
              <div className="flex absolute bottom-6 left-8 gap-1 items-center">
                <ElapsedTime
                  current={currentSeconds}
                  total={track.audio?.duration}
                  className="opacity-85 text-xs max-xs:text-[0.65rem]"
                />
              </div>
            </div>

            <WidgetPlayerBar
              currentTrack={track}
              embeddedInMirlo={embeddedInMirlo}
              currentSeconds={currentSeconds}
              setCurrentSeconds={setCurrentSeconds}
            />
          </div>
        </>
      )}
    </WidgetWrapper>
  );
};

export default Card;
