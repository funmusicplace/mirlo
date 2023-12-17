import styled from "@emotion/styled";
import React from "react";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import ImageWithPlaceholder from "./ImageWithPlaceholder";
import { PlayingMusicBars } from "./PlayingMusicBars";
import PlayButton from "./PlayButton";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Wishlist from "components/TrackGroup/Wishlist";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import PauseButton from "./PauseButton";

type WrapperProps = {
  width: number;
  height: number;
};

const TrackgroupButtons = styled.div`
  width: 100%;
  position: absolute;
  bottom: 0;
  display: flex;
  justify-content: flex-end;

  div {
    width: 100%;
    button {
      padding: 0;
      height: 3rem !important;
      color: white !important;
      font-weight: normal;
      font-size: 1.3rem;
      text-transform: uppercase;
      width: 100%;
      height: 3rem;
    }
  }
  ul {
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    list-style-type: none;

    li:first-child > button {
      padding-left: 0.8rem;
    }
    button {
      width: 3rem;
      height: 3rem;
    }
  }
  @media (max-width: ${bp.large}px) {
    ul {
      button {
        font-size: 1.1rem;
        width: 2rem !important;
        height: 2rem !important;
        margin: 0 !important;
        padding: 0 0 0 0.4rem !important;
      }
    }
  }
  @media (max-width: ${bp.small}px) {
    div:first-child {
      display: none;
    }
    div:last-child {
      display: block !important;
    }
    ul {
      button {
        font-size: 1.1rem;
        width: 2rem !important;
        height: 2rem !important;
        margin: 0 !important;
        padding: 0 0 0 0.4rem !important;
      }
      li:first-child {
        display: none;
      }
    }
  }
`;

const PlayWrapper = styled.div<WrapperProps>`
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

  .startIcon {
    margin-right: 0rem !important;
  }

  button {
    font-size: 1.4rem;
    right: 0;
    bottom: 0;
    padding: 0rem;
    padding-left: 0.8rem;
    margin: auto;
    border-radius: 0px;
    border: var(--mi-border);
    background-color: rgba(0, 0, 0, 0.7);

    &:nth-of-type(1) {
      margin: 0rem;
    }

    &:last-child {
      padding-left: 0.9rem;
    }

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.5);
      color: var(--mi-black);
    }
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.6);
    opacity: 1;
  }

  @media (max-width: ${bp.small}px) {
    background-color: transparent !important;
    opacity: 1;
    justify-content: flex-end;
    align-items: flex-end;

    button:active {
      background-color: rgba(0, 0, 0, 0.7);
    }
  }
`;

const Wrapper = styled.div<WrapperProps>`
  position: relative;
  max-width: 100%;
  width: ${(props) => props.width}px;

  .startIcon {
    font-size: 1.3rem !important;
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
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    display: block;
    // padding-top: ${(props) => props.height / 2 - 12}px;
  }

  @media (max-width: ${bp.large}px) {
    position: relative;
    p {
      font-size: var(--mi-font-size-xsmall);
    }

    img {
      width: ${(props) => (props.width < 420 ? `${props.width}px` : "100%")};
      height: ${(props) => (props.height < 420 ? `${props.height}px` : "auto")};
    }
  }
  @media (max-width: ${bp.small}px) {
    p {
      display: none;
    }
  }
`;

const ClickToPlay: React.FC<{
  trackGroup: TrackGroup;
  artist?: Artist;
  trackGroupId?: number;
  title: string;
  image?: { width: number; height: number; url: string };
  className?: string;
}> = ({ trackGroup, artist, trackGroupId, title, image, className }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();

  const [trackIds, setTrackIds] = React.useState<number[]>([]);

  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  const onClickPlay = React.useCallback(async () => {
    let ids: number[] = [];
    if (trackGroupId) {
      const { result } = await api.get<TrackGroup>(
        `trackGroups/${trackGroupId}`
      );
      console.log("trackGroups", result);
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
    <Wrapper
      width={image?.width ?? 0}
      height={image?.height ?? 0}
      className={className}
    >
      <PlayWrapper width={image?.width ?? 0} height={image?.height ?? 0}>
        <Link
          to={`/${artist?.urlSlug ?? artist?.id}/release/${
            trackGroup?.urlSlug ?? trackGroup?.id
          }`}
        ></Link>
        <TrackgroupButtons>
          <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
          <ul>
            <li>
              <Wishlist trackGroup={trackGroup} />
            </li>

            <li>{!currentlyPlaying && <PlayButton onPlay={onClickPlay} />}</li>

            <li>{currentlyPlaying && <PauseButton />}</li>
          </ul>
        </TrackgroupButtons>

        <p>{t("goToAlbum")}</p>
      </PlayWrapper>

      {currentlyPlaying && (
        <PlayingMusicBars
          width={image?.width ?? 0}
          height={image?.height ?? 0}
        />
      )}
      {image && (
        <ImageWithPlaceholder src={image.url} alt={title} size={image.width} />
      )}
    </Wrapper>
  );
};

export default ClickToPlay;
