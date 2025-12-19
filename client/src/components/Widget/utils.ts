import styled from "@emotion/styled";
import { bp } from "../../constants";

export function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function inMirlo() {
  try {
    return window.top?.location.origin === import.meta.env.VITE_CLIENT_DOMAIN;
  } catch (e) {
    return false;
  }
}

export const WidgetWrapper = styled.div<{
  embeddedInMirlo?: boolean;
  artistColors?: ArtistColors;
}>`
  border: var(--mi-border);

  ${(props) => props.embeddedInMirlo && "min-height: 154px;"}
  display: flex;
  align-items: space-between;
  border-radius: 0.3rem;
  overflow: hidden;
  box-sizing: border-box;

  a {
    color: ${(props) =>
      props.artistColors?.primary ?? "var(--mi-primary-color)"};
    }

  color: ${(props) =>
    props.artistColors?.foreground ??
    "var(--mi-normal-foreground-color)"} !important;
    background-color: ${(props) =>
      props.artistColors?.background ??
      "var(--mi-normal-background-color)"} !important;
      
      button.play-button,
      button.pause-button {
      color: ${(props) =>
        props.artistColors?.foreground ?? "var(--mi-normal-foreground-color)"};
        
        background: transparent;
        
        svg {
        fill: ${(props) =>
          props.artistColors?.foreground ??
          "var(--mi-normal-foreground-color)"} !important; 
        }   
    } 

  tr {
  
  &:hover {
  color: ${(props) =>
    props.artistColors?.background ??
    "var(--mi-normal-foreground-color)"} !important;
    background-color: ${(props) =>
      props.artistColors?.foreground ??
      "var(--mi-normal-background-color)"} !important;
      
      button.play-button,
      button.pause-button {
      color: ${(props) =>
        props.artistColors?.background ?? "var(--mi-normal-foreground-color)"};
        
        background: transparent;
        
        svg {
        fill: ${(props) =>
          props.artistColors?.background ??
          "var(--mi-normal-foreground-color)"} !important; 
        }   
    } 
  }

`;

export const TgWidgetWrapper = styled.div<{ embeddedInMirlo?: boolean }>`
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 1fr;

  @media screen and (max-width: ${bp.small}px) {
    grid-template-columns: 1fr;
    grid-template-rows: 50% 50%;

    .image-container {
      width: 100%;
    }
  }
`;

export const TrackListWrapper = styled.div<{}>`
  border-top: var(--mi-border);
  overflow: auto;
  max-height: 280px;
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
export const WidgetTitleWrapper = styled.div<{}>`
  border-left: var(--mi-border);

  @media screen and (max-width: ${bp.small}px) {
    a {
      font-size: var(--mi-font-size-small) !important;
      white-space: nowrap;
      max-width: 100%;
      display: block;
      text-overflow: ellipsis;
    }
  }
`;

export const FlexWrapper = styled.div`
  display: flex;
`;
