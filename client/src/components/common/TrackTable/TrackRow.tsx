import { css } from "@emotion/css";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";
import { bp } from "../../../constants";
import TrackRowPlayControl from "./TrackRowPlayControl";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";
import Tooltip from "../Tooltip";
import TrackAuthors from "./TrackAuthors";
import EmbedLink from "./EmbedLink";
import TrackLink from "./TrackLink";
import DropdownMenu from "../DropdownMenu";
import LyricsModal from "./LyricsModal";
import FavoriteTrack from "components/TrackGroup/Favorite";
import { useGetArtistColors } from "components/Artist/ArtistButtons";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";

const LicenseSpan = styled.a`
  text-wrap: nowrap;
  max-width: 4rem;
  display: block;
  overflow: ellipsis;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const TR = styled.tr<{
  canPlayTrack: boolean;
  colors?: ArtistColors;
}>`
  ${(props) =>
    !props.canPlayTrack
      ? `color: ${props.colors?.primary ?? "var(--mi-normal-foreground-color)"}; opacity: .6;`
      : ""}

  &:hover {
    color: ${(props) =>
      props.colors?.background ??
      "var(--mi-normal-foreground-color)"} !important;
    background-color: ${(props) =>
      props.colors?.foreground ??
      "var(--mi-normal-background-color)"} !important;

    button.play-button,
    button.pause-button {
      color: ${(props) =>
        props.colors?.background ?? "var(--mi-normal-foreground-color)"};
      background: transparent;

      svg {
        fill: ${(props) =>
          props.colors?.background ??
          "var(--mi-normal-foreground-color)"} !important;
      }
    }

    .mi-dropdown-button {
      background-color: ${(props) =>
        props.colors?.background ??
        "var(--mi-normal-foreground-color)"} !important;
      color: ${(props) =>
        props.colors?.foreground ??
        "var(--mi-normal-background-color)"} !important;
    }

    .track-authors {
      color: ${(props) =>
        props.colors?.background ??
        "var(--mi-normal-foreground-color)"} !important;
      opacity: 0.8 !important;
    }
  }

  button.play-button,
  button.pause-button {
    color: ${(props) =>
      props.colors?.primary ?? "var(--mi-normal-foreground-color)"};
    background: transparent;
    font-size: 0.8rem;

    svg {
      fill: ${(props) =>
        props.colors?.primary ?? "var(--mi-normal-foreground-color)"};
    }
  }

  > td {
    line-height: 2rem !important;
  }

  > td > .play-button {
    display: none;
  }
  > td > .track-number {
    display: block;
    width: 2rem;
    line-height: 2rem !important;
  }
  &:hover > td > .play-button,
  &:hover > td > .pause-button {
    display: flex;
  }
  ${(props) =>
    props.canPlayTrack
      ? `&:hover > td > .track-number {
          display: none;
        }`
      : ""}

  @media screen and (max-width: ${bp.small}px) {
    td {
      padding: 0.15rem 0.3rem;
    }
    > td > .play-button {
    }
    > td > .track-number {
    }
  }
`;

const FirstTD = styled.td`
  height: 30px;

  button {
    background: none;
  }
  button:hover {
    background: none !important;
  }
  @media screen and (max-width: ${bp.small}px) {
    button {
      background: none;
    }
    button:hover {
      background: none !important;
    }
  }
`;

const TrackTitleTD = styled.td`
  width: 100%;
  padding: 0rem;
  margin: 0rem;
`;

const DropdownTD = styled.td<{
  showDropdown?: boolean;
}>`
  ${(props) => (props.showDropdown ? `display: visible;` : "display : none;")}
`;

const TrackRow: React.FC<{
  showDropdown?: boolean;
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
  size?: "small";
}> = ({ track, addTracksToQueue, trackGroup, size, showDropdown }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { dispatch } = useGlobalStateContext();
  const [trackTitle] = React.useState(track.title);
  const { user } = useAuthContext();
  const { colors } = useGetArtistColors();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);

  const onTrackPlay = React.useCallback(() => {
    if (canPlayTrack) {
      addTracksToQueue?.(track.id);
      dispatch({ type: "setPlaying", playing: true });
    }
  }, [addTracksToQueue, canPlayTrack, dispatch, track.id]);

  return (
    <TR
      key={track.id}
      id={`${track.id}`}
      canPlayTrack={canPlayTrack}
      colors={colors}
    >
      <FirstTD onClick={onTrackPlay}>
        <TrackRowPlayControl
          trackId={track.id}
          canPlayTrack={canPlayTrack}
          trackNumber={track.order}
          onTrackPlayCallback={addTracksToQueue}
        />
      </FirstTD>
      <TrackTitleTD onClick={onTrackPlay}>
        <div
          className={css`
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            padding: 0.1rem;
            margin-bottom: 0rem;
            justify-content: space-between;
            align-items: center;

            @media screen and (max-width: ${bp.small}px) {
              flex-wrap: nowrap;
            }
          `}
        >
          <div
            className={css`
              overflow: hidden;
              text-overflow: ellipsis;

              i {
                opacity: 0.8;
              }

              @media screen and (max-width: ${bp.medium}px) {
                font-size: 0.9rem;
              }

              @media screen and (max-width: ${bp.small}px) {
                td {
                  padding: 0.15rem 0.3rem;
                }
              }
            `}
          >
            {trackTitle ?? <i>{t("untitled")}</i>}
            <TrackAuthors
              track={track}
              trackGroupArtistId={trackGroup.artistId}
            />
          </div>

          <div
            className={css`
              font-size: 0.9rem;
              @media screen and (max-width: ${bp.medium}px) {
                font-size: 0.7rem;
                font-weight: bold;
                margin-left: 0.2rem;
                td {
                  padding: 0.15rem 0.3rem;
                }
              }
            `}
          >
            {track.audio?.duration && fmtMSS(track.audio.duration)}
          </div>
        </div>
      </TrackTitleTD>

      {/* <td align="right">
        <TrackLink
          track={track}
          trackGroup={trackGroup}
          artist={trackGroup.artist}
        />
      </td> */}

      {size !== "small" && (
        <DropdownTD showDropdown={showDropdown} align="right">
          <DropdownMenu smallIcon compact label="Track options">
            <ul>
              <li>
                <EmbedLink track={track} />
              </li>
              <li>
                <TrackLink
                  track={track}
                  trackGroup={trackGroup}
                  artist={trackGroup.artist}
                />
              </li>
              <li>
                <FavoriteTrack track={track} />
              </li>
              {track.lyrics && (
                <li>
                  <LyricsModal track={track} />
                </li>
              )}
              <li>
                {size !== "small" &&
                  track.license &&
                  track.license?.short !== "copyright" && (
                    <Tooltip hoverText={track.license.name}>
                      {track.license.link && (
                        <LicenseSpan
                          as="a"
                          target="_blank"
                          href={track.license.link}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className={css`
                            overflow: ellipsis;
                            font-size: 0.9rem;
                            text-align: right;
                            display: flex;
                            align-items: center;
                            gap: 1rem;
                            width: 100%;
                          `}
                        >
                          <span>{track.license.short}</span>{" "}
                          <FaExternalLinkAlt />
                        </LicenseSpan>
                      )}
                      {!track.license.link && (
                        <LicenseSpan as="span">
                          {track.license.short}
                        </LicenseSpan>
                      )}
                    </Tooltip>
                  )}
              </li>
            </ul>
          </DropdownMenu>
        </DropdownTD>
      )}
    </TR>
  );
};
export default TrackRow;
