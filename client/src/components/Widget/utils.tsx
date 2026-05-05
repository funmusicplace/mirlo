import styled from "@emotion/styled";
import { AudioWrapper } from "components/Player/AudioWrapper";
import React from "react";
import { Link } from "react-router-dom";
import { fmtMSS } from "utils/tracks";

import { bp } from "../../constants";

import WidgetActionButtons from "./WidgetActionButtons";

export const WidgetWrapper = styled.div<{
  artistColors?: ArtistColors;
  embeddedInMirlo?: boolean;
}>`
  border: 1px solid
    color-mix(
      in srgb,
      ${(props) =>
          props.embeddedInMirlo ? "currentColor" : "var(--mi-text-color)"}
        20%,
      transparent
    );
  display: flex;
  align-items: space-between;
  overflow: hidden;
  box-sizing: border-box;

  ${(props) =>
    props.artistColors?.button &&
    `--mi-button-color: ${props.artistColors.button};`}
  ${(props) =>
    props.artistColors?.buttonText &&
    `--mi-button-text-color: ${props.artistColors.buttonText};`}

  a {
    color: ${(props) => props.artistColors?.button ?? "var(--mi-button-color)"};
  }

  color: ${(props) =>
    props.artistColors?.text ?? "var(--mi-text-color)"} !important;
  background-color: ${(props) =>
    props.artistColors?.background ?? "var(--mi-background-color)"} !important;

  tr:hover {
    color: ${(props) =>
      props.artistColors?.background ?? "var(--mi-text-color)"} !important;
    background-color: ${(props) =>
      props.artistColors?.text ?? "var(--mi-background-color)"} !important;
  }
`;

export const TgWidgetWrapper = styled.div`
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "cover title"
    "cover tracks";

  @media screen and (max-width: ${bp.small}px) {
    grid-template-columns: 130px 1fr;
    grid-template-rows: 130px 1fr;
    grid-template-areas:
      "cover title"
      "tracks tracks";
  }
`;

export const TrackListWrapper = styled.div<{}>`
  flex: 1;
  min-height: 0;
  overflow: auto;
  ::-webkit-scrollbar {
    -webkit-appearance: none;
  }
  ::-webkit-scrollbar:vertical {
    width: 7px;
  }
  ::-webkit-scrollbar:horizontal {
    height: 7px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
  ::-webkit-scrollbar-track {
    border-radius: 0px;
    background-color: rgba(255, 255, 255, 0.2);
  }
  @media screen and (max-width: ${bp.small}px) {
    overflow: auto;
  }
`;

export const WidgetLink: React.FC<{
  to: string;
  embeddedInMirlo: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ to, embeddedInMirlo, children, className }) => {
  if (embeddedInMirlo) {
    return (
      <Link
        to={to}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={`${import.meta.env.VITE_CLIENT_DOMAIN}${to}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
};

export const WidgetActionsCorner: React.FC<{
  artist: Artist | undefined;
  trackGroup: TrackGroup;
  track?: Track;
}> = ({ artist, trackGroup, track }) => {
  if (!trackGroup.artist) return null;
  return (
    <div className="shrink-0 absolute top-1 right-1">
      <WidgetActionButtons
        artist={artist}
        trackGroup={trackGroup}
        track={track}
      />
    </div>
  );
};

export const WidgetPlayerBar: React.FC<{
  currentTrack: Track | undefined;
  embeddedInMirlo: boolean;
  currentSeconds: number;
  setCurrentSeconds: (seconds: number) => void;
}> = ({ currentTrack, embeddedInMirlo, currentSeconds, setCurrentSeconds }) => {
  if (!currentTrack || embeddedInMirlo) return null;
  return (
    <div className="absolute bottom-0 left-0 right-0">
      <AudioWrapper
        currentTrack={currentTrack}
        position="static"
        setCurrentSeconds={setCurrentSeconds}
        currentSeconds={currentSeconds}
        compact
      />
    </div>
  );
};

export const ElapsedTime: React.FC<{
  current: number;
  total?: number | null;
  className?: string;
}> = ({ current, total, className }) => (
  <span className={`tabular-nums ${className ?? ""}`}>
    {fmtMSS(current)}
    {total ? (
      <span className="opacity-60">
        {" / "}
        {fmtMSS(total)}
      </span>
    ) : null}
  </span>
);
