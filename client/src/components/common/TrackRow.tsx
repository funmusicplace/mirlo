import { css } from "@emotion/css";
import React from "react";
import { FiLink } from "react-icons/fi";
import { useGlobalStateContext } from "state/GlobalState";

import Button from "./Button";
import { fmtMSS, isTrackOwnedOrPreview, widgetUrl } from "utils/tracks";
import { useSnackbar } from "state/SnackbarContext";
import { bp } from "../../constants";
import TrackRowPlayControl from "./TrackRowPlayControl";
import { useAuthContext } from "state/AuthContext";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

const TR = styled.tr<{ canPlayTrack: boolean }>`
  ${(props) =>
    !props.canPlayTrack
      ? `color: var(--mi-normal-foreground-color); opacity: .3;`
      : ""}

  &:hover {
    color: var(--mi-normal-background-color) !important;
    ${(props) =>
      !props.canPlayTrack
        ? `background-color: var(--mi-normal-foreground-color);`
        : `background-color: var(--mi-normal-foreground-color) !important;`}

    button {
      color: var(--mi-normal-background-color);
      background: transparent;
    }
  }

  button {
    color: var(--mi-normal-foreground-color);
    background: transparent;
    font-size: 0.8rem;

    &:hover {
      color: var(--mi-normal-background-color) !important;
      background: transparent;
    }
  }

  > td > .play-button {
    display: none;
  }
  > td > .track-number {
    display: block;
  }
  &:hover > td > .play-button {
    display: block;
    width: 2rem;
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
    span {
      width: 1rem !important;
      margin-right: 1rem !important;
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

const TrackRow: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
}> = ({ track, addTracksToQueue, trackGroup }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const snackbar = useSnackbar();
  const { dispatch } = useGlobalStateContext();
  const [trackTitle] = React.useState(track.title);
  const { user } = useAuthContext();

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);

  const onTrackPlay = React.useCallback(() => {
    if (canPlayTrack) {
      addTracksToQueue?.(track.id);
      dispatch({ type: "setPlaying", playing: true });
    }
  }, [addTracksToQueue, canPlayTrack, dispatch, track.id]);

  const coAuthors =
    track.trackArtists?.filter((artist) => artist.isCoAuthor) ?? [];

  return (
    <TR
      key={track.id}
      id={`${track.id}`}
      onClick={onTrackPlay}
      canPlayTrack={canPlayTrack}
    >
      <FirstTD>
        <TrackRowPlayControl
          trackId={track.id}
          canPlayTrack={canPlayTrack}
          trackNumber={track.order}
          onTrackPlayCallback={addTracksToQueue}
        />
      </FirstTD>
      <TrackTitleTD>
        <div
          className={css`
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            padding: 0.1rem;
            margin-bottom: 0rem;
            justify-content: space-between;
            align-items: center;

            &:hover {
              cursor: pointer;
            }

            @media screen and (max-width: ${bp.small}px) {
              flex-wrap: nowrap;
            }
          `}
        >
          <div
            className={css`
              overflow: hidden;
              text-overflow: ellipsis;

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
            {trackTitle}
            {coAuthors.find(
              (author) => author.artistId !== trackGroup.artistId
            ) && (
              <span
                className={css`
                  color: var(--mi-lighter-foreground-color);
                  margin-left: 0.5rem;

                  @media (prefers-color-scheme: dark) {
                    color: var(--mi-light-foreground-color);
                  }
                `}
              >
                {coAuthors.map((a) => a.artistName).join(", ")}
              </span>
            )}
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
      <td align="right">
        <Button
          compact
          transparent
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(widgetUrl(track.id, "track"));
            snackbar(t("copiedTrackUrl"), { type: "success" });
          }}
          startIcon={<FiLink />}
          className={css`
            .startIcon {
              padding-left: 1rem;
            }
            :hover {
              background: transparent !important;
              opacity: 0.6;
            }
          `}
        ></Button>
      </td>
    </TR>
  );
};
export default TrackRow;
