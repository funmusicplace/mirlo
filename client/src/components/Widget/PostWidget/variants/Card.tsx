import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import NextButton from "components/common/NextButton";
import PrevButton from "components/common/PrevButton";
import React from "react";
import { useTranslation } from "react-i18next";
import { getArtistUrlReference, getPostURLReference } from "utils/artist";
import { fmtMSS } from "utils/tracks";

import { PlayButtonsWrapper } from "../../PlayButtonsWrapper";
import {
  ElapsedTime,
  TgWidgetWrapper,
  TrackListWrapper,
  WidgetLink,
  WidgetPlayerBar,
  WidgetWrapper,
} from "../../utils";
import { usePostWidgetData } from "../usePostWidgetData";

const Card = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    post,
    isLoading,
    currentTrack,
    currentSeconds,
    setCurrentSeconds,
    elapsedSeconds,
    embeddedInMirlo,
    playableTracks,
  } = usePostWidgetData();

  if ((!post || !post.id) && !isLoading) {
    return (
      <div className="[border:var(--mi-border)] flex w-full justify-center p-4">
        {t("trackDoesntExist")}
      </div>
    );
  }

  if (!post) return null;

  const artist = post.artist;
  const trackIds = playableTracks?.map((t) => t.trackId) ?? [];
  const currentPostTrack = post.tracks?.find(
    (t) => t.trackId === currentTrack?.id
  );

  const artistRef = artist
    ? embeddedInMirlo
      ? `/${getArtistUrlReference(artist)}`
      : `/${getArtistUrlReference(artist)}`
    : undefined;

  const postRef = getPostURLReference(post);

  const cover = (
    <div className="[grid-area:cover] relative sm:aspect-square sm:h-full">
      <div className="absolute right-[2.5%] bottom-[2.5%] z-10">
        <PlayButtonsWrapper ids={trackIds} />
      </div>
      {post.featuredImage?.src ? (
        <ImageWithPlaceholder
          src={post.featuredImage.src}
          alt={post.title}
          size={600}
          square
          objectFit="cover"
        />
      ) : (
        <div className="absolute inset-0 bg-(--mi-darken-background-color)" />
      )}
    </div>
  );

  const titleBlock = (
    <div className="[grid-area:title] min-w-0 overflow-hidden border-l border-current/20 flex flex-col relative">
      <div className="flex-1 min-h-0 flex items-center sm:items-stretch sm:pt-8 sm:pb-8 px-4 gap-2 relative">
        <div className="flex-1 min-w-0 flex flex-col gap-1 max-xs:gap-0 max-sm:mt-2">
          <div className="text-lg font-bold leading-tight truncate break-normal max-sm:text-base max-xs:text-sm">
            {artistRef ? (
              <WidgetLink to={postRef} embeddedInMirlo={embeddedInMirlo}>
                {post.title}
              </WidgetLink>
            ) : (
              post.title
            )}
          </div>
          {artist && artistRef && (
            <div className="text-sm opacity-85 leading-normal truncate break-normal max-sm:text-xs max-xs:text-[0.65rem]">
              {t("by")}{" "}
              <WidgetLink to={artistRef} embeddedInMirlo={embeddedInMirlo}>
                {artist.name}
              </WidgetLink>
              {post.tracks && post.tracks.length > 0 && (
                <>
                  {" · "}
                  {t("trackCount", { count: post.tracks.length })}
                </>
              )}
            </div>
          )}
          {(currentPostTrack || (post.tracks?.length ?? 0) > 1) && (
            <div className="text-sm opacity-85 leading-normal break-normal max-sm:text-xs max-xs:text-[0.65rem] flex items-center justify-between gap-2">
              <span className="flex-1 min-w-0 truncate">
                {currentPostTrack && (
                  <>
                    <em>{t("playing")}</em> {currentPostTrack.title}
                    {" · "}
                    <ElapsedTime current={elapsedSeconds} />
                  </>
                )}
              </span>
              {(post.tracks?.length ?? 0) > 1 && (
                <div className="shrink-0 flex items-center gap-1">
                  <PrevButton compact />
                  <NextButton compact />
                </div>
              )}
            </div>
          )}
        </div>
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
      <TgWidgetWrapper>
        {cover}
        {titleBlock}
        <div className="[grid-area:tracks] flex flex-col min-h-0 overflow-hidden border-l border-t border-current/20 max-sm:border-l-0 relative">
          <TrackListWrapper id="post-tracks-scroll">
            <table className="w-full text-sm">
              <tbody>
                {post.tracks?.map((track, i) => {
                  const isPlaying = currentTrack?.id === track.trackId;
                  return (
                    <tr
                      key={track.trackId}
                      className={`flex items-center px-3 py-1.5 gap-2 border-b border-current/10 last:border-0 ${isPlaying ? "font-semibold" : "opacity-85"}`}
                    >
                      <td className="w-5 shrink-0 text-center text-xs opacity-60">
                        {isPlaying ? "▶" : i + 1}
                      </td>
                      <td className="flex-1 min-w-0 truncate">
                        {track.title ?? t("untitled")}
                      </td>
                      {track.audioDuration && (
                        <td className="shrink-0 text-xs opacity-60 tabular-nums">
                          {fmtMSS(track.audioDuration)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TrackListWrapper>
        </div>
      </TgWidgetWrapper>
    </WidgetWrapper>
  );
};

export default Card;
