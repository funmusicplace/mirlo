import styled from "@emotion/styled";

import { bp } from "../../constants";

export const WidgetWrapper = styled.div<{
  artistColors?: ArtistColors;
}>`
  border: var(--mi-border);
  display: flex;
  align-items: space-between;
  border-radius: 0.3rem;
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
      props.artistColors?.background ??
      "var(--mi-background-color)"} !important;
      
      button.play-button,
      button.pause-button {
      color: ${(props) => props.artistColors?.text ?? "var(--mi-text-color)"};
        
        background: transparent;
        
        svg {
        fill: ${(props) =>
          props.artistColors?.text ?? "var(--mi-text-color)"} !important; 
        }   
    } 

  tr {
  
  &:hover {
  color: ${(props) =>
    props.artistColors?.background ?? "var(--mi-text-color)"} !important;
    background-color: ${(props) =>
      props.artistColors?.text ?? "var(--mi-background-color)"} !important;
      
      button.play-button,
      button.pause-button {
      color: ${(props) =>
        props.artistColors?.background ?? "var(--mi-text-color)"};
        
        background: transparent;
        
        svg {
        fill: ${(props) =>
          props.artistColors?.background ?? "var(--mi-text-color)"} !important; 
        }   
    } 
  }

`;

export const TgWidgetWrapper = styled.div`
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-columns: 230px 1fr;
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
