import { css } from "@emotion/css";
import styled from "@emotion/styled";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import FavoriteTrack from "components/TrackGroup/Favorite";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";

import { bp } from "../../../constants";
import DropdownMenu from "../DropdownMenu";
import Tooltip from "../Tooltip";

import EmbedLink from "./EmbedLink";
import LyricsModal from "./LyricsModal";
import TrackAuthors from "./TrackAuthors";
import TrackLink from "./TrackLink";
import TrackRowPlayControl from "./TrackRowPlayControl";

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
}>`
  ${(props) =>
    !props.canPlayTrack ? `color: var(--mi-contrast-color); opacity: .6;` : ""}

  display: flex;
  align-items: start;

  &:hover {
    background-color: var(--mi-tint-x-color);
  }

  button.play-button,
  button.pause-button {
    color: var(--mi-contrast-color);
    background: transparent;
    font-size: 0.8rem;

    svg {
      fill: var(--mi-contrast-color);
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

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);

  const ownsTrack = !!user?.userTrackPurchases?.find(
    (p) => p.trackId === track.id
  );
  const ownsTrackGroup = !!user?.userTrackGroupPurchases?.find(
    (p) => p.trackGroupId === trackGroup.id
  );
  const isOwned = ownsTrack || ownsTrackGroup;
  const canDownloadTrack =
    isOwned && (!trackGroup.isPreorder || track.isPreview);

  const onTrackPlay = React.useCallback(() => {
    if (canPlayTrack) {
      addTracksToQueue?.(track.id);
      dispatch({ type: "setPlaying", playing: true });
    }
  }, [addTracksToQueue, canPlayTrack, dispatch, track.id]);

  return (
    <TR key={track.id} id={`${track.id}`} canPlayTrack={canPlayTrack}>
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
            margin-bottom: 0rem;
            justify-content: space-between;
            align-items: flex-start;

            @media screen and (max-width: ${bp.small}px) {
              flex-wrap: nowrap;
            }
          `}
        >
          <div
            className={css`
              overflow: hidden;
              text-overflow: ellipsis;
              margin-right: 0.2rem;
              flex-grow: 1;

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
              {canDownloadTrack && (
                <li>
                  <DownloadAlbumButton
                    track={track}
                    trackGroup={trackGroup}
                    dropdownItem
                  />
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
