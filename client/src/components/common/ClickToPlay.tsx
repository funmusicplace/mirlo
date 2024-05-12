import styled from "@emotion/styled";
import React from "react";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import ImageWithPlaceholder from "./ImageWithPlaceholder";
import { PlayingMusicBars } from "./PlayingMusicBars";
import PlayButton from "./PlayButton";
import { useTranslation } from "react-i18next";
import Wishlist from "components/TrackGroup/Wishlist";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import PauseButton from "./PauseButton";
import { getReleaseUrl } from "utils/artist";
import { useAuthContext } from "state/AuthContext";
import { Link } from "react-router-dom";

const TrackgroupButtons = styled.div`
  width: 100%;
  position: absolute;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  z-index: 2;

  & > div:first-of-type {
    width: 100%;
    flex-grow: 1;

    button {
      height: 3rem;
      color: white !important;
      font-weight: normal;
      font-size: 1.3rem;
      text-transform: uppercase;
      width: 100%;
    }
  }

  button {
    background-color: rgba(0, 0, 0, 0.6) !important;
    min-height: 3rem;
    min-width: 3rem;
  }

  @media (max-width: ${bp.large}px) {
    & > div:first-of-type {
      button {
        height: 2rem;
        font-size: 1rem;
      }
    }
    button {
      font-size: 1.1rem;
      min-width: 2rem;
      min-height: 2rem;
    }
  }

  @media (max-width: ${bp.small}px) {
    & > div:first-of-type {
      display: none;
    }
    button {
      font-size: 1.1rem;
    }
  }
`;

const PlayWrapper = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;

  z-index: 4;

  width: 100%;
  height: 100%;
  top: 0;
  opacity: 0;
  background-color: rgba(0, 0, 0, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: 0.5s;

  button {
    font-size: 1.4rem;
    right: 0;
    bottom: 0;
    margin: auto;
    border-radius: 0px;
    border: var(--mi-border);
    background-color: rgba(0, 0, 0, 0.7);

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.5) !important;
      color: var(--mi-black);
    }
  }

  // When using a touchscreen device, always show the album buttons
  // instead of only on hover
  // - combines with a similar query on <Wrapper> to hide the "Go to album" text
  @media (pointer: coarse) {
    background-color: transparent;
    opacity: 1;
    justify-content: flex-end;
    align-items: flex-end;

    button:active {
      background-color: rgba(0, 0, 0, 0.7);
    }
  }
`;

const Wrapper = styled.div`
  position: relative;
  max-width: 100%;

  .startIcon {
    font-size: 1.5rem !important;
    line-height: 1.3rem !important;
  }

  a {
    display: flex;
    justify-content: center;
    position: absolute;
    z-index: 1;
    text-align: center;
    align-items: center;
    width: 100%;
    height: 100%;
    text-decoration: none;
    text-transform: uppercase;
    font-size: var(--mi-font-size-small);
  }

  p {
    min-width: 50%;
    margin: auto;
    background: var(--mi-lighten-background-color);
    border-radius: var(--mi-border-radius);
    padding: 0.5rem;
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
    font-size: var(--mi-font-size-small);
  }
  img {
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    display: block;
  }

  @media (max-width: ${bp.large}px) {
    .startIcon {
      font-size: 1.2rem !important;
      line-height: 1rem !important;
    }
    position: relative;
    p {
      font-size: var(--mi-font-size-xsmall);
    }
  }

  // Together with @media (pointer: coarse) in <PlayWrapper> - this hides the "Go to album" text on hover
  @media (pointer: coarse) {
    p {
      display: none;
    }
  }
`;

// This wrapper component contains both the "click to play" box *and*
// related content (title, artist link) so that focusing/hovering on
// any of them will also make the play button visible
const ClickToPlayWrapper = styled.div`
  cursor: pointer;

  &:hover,
  &:focus-within {
    .play-wrapper {
      background-color: rgba(0, 0, 0, 0.6) !important;
      opacity: 1;
    }
  }
`;

const ClickToPlay: React.FC<
  React.PropsWithChildren<{
    trackGroup: TrackGroup;
    artist?: Artist;
    trackGroupId?: number;
    title: string;
    image?: { width: number; height: number; url: string };
    className?: string;
  }>
> = ({
  trackGroup,
  artist,
  trackGroupId,
  title,
  image,
  className,
  children,
}) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();

  const { user } = useAuthContext();

  const [trackIds, setTrackIds] = React.useState<number[]>([]);

  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  const onClickPlay = React.useCallback(async () => {
    let ids: number[] = [];
    if (trackGroupId) {
      const { result } = await api.get<TrackGroup>(
        `trackGroups/${trackGroupId}`
      );
      ids = result.tracks
        .filter((item) => item.isPreview)
        .map((item) => item.id);
      setTrackIds(ids);
    }
    dispatch({
      type: "startPlayingIds",
      playerQueueIds: ids,
    });
  }, [dispatch, trackGroupId]);

  const currentlyPlaying =
    playing &&
    currentlyPlayingIndex !== undefined &&
    trackIds.includes(playerQueueIds[currentlyPlayingIndex]);

  return (
    <ClickToPlayWrapper>
      <Wrapper className={className}>
        <PlayWrapper className="play-wrapper">
          {/*
           * This link is not visible to the user, and should be duplicated by an album link provided in {children}.
           * As such, it is safe to exclude this from the accessibility tree.
           * https://www.w3.org/TR/wai-aria/states_and_properties#aria-hidden
           */}
          {artist && (
            <Link
              to={getReleaseUrl(artist, trackGroup)}
              aria-hidden
              tabIndex={-1}
            ></Link>
          )}
          <TrackgroupButtons>
            <div>
              <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
            </div>
            {user && <Wishlist trackGroup={trackGroup} />}

            {!currentlyPlaying && <PlayButton onPlay={onClickPlay} />}

            {currentlyPlaying && <PauseButton />}
          </TrackgroupButtons>

          {/*
           * Likewise, this "Go to album" text SHOULD also be used to describe the album link (through aria-label).
           */}
          <p aria-hidden>{t("goToAlbum")}</p>
        </PlayWrapper>

        {currentlyPlaying && (
          <PlayingMusicBars
            width={image?.width ?? 0}
            height={image?.height ?? 0}
          />
        )}
        {image && (
          <ImageWithPlaceholder
            src={image.url}
            alt={title}
            size={image.width}
            square
          />
        )}
      </Wrapper>
      {children}
    </ClickToPlayWrapper>
  );
};

export default ClickToPlay;
