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
    return window.top?.location.origin === process.env.REACT_APP_CLIENT_DOMAIN;
  } catch (e) {
    return false;
  }
}

export const WidgetWrapper = styled.div<{ embeddedInMirlo?: boolean }>`
  display: flex;
  border: var(--mi-border);
  flex-direction: column;
  width: 100%;
  ${(props) => props.embeddedInMirlo && "min-height: 154px;"}
  display: flex;
  flex-direction: column;
  align-items: space-between;
  border-radius: 0.3rem;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--mi-normal-background-color);
  a {
    color: var(--mi-normal-foreground-color);
  }
`;

export const TgWidgetWrapper = styled.div<{ embeddedInMirlo?: boolean }>`
  display: flex;
  width: 100%;
  ${(props) => props.embeddedInMirlo && "min-height: 154px;"}
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  border-radius: 0.3rem;
  box-sizing: border-box;
  height: 100%;
  table {
    margin: 0;
  }

  @media screen and (max-width: ${bp.small}px) {
    grid-template-columns: repeat(1, 1fr);
    padding: 0.5rem 0 0 0rem;
    justify-content: center;
    align-content: space-between;
    gap: 0;
  }
`;

export const TrackListWrapper = styled.div<{}>`
  border-top: var(--mi-border);
  padding-right: 2%;
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
    max-height: 70px;
    overflow: auto;
  }
`;
export const WidgetTitleWrapper = styled.div<{}>`
  display: flex;
  flex: 45%;
  border-left: var(--mi-border);
  max-width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: flex-start;

  @media screen and (max-width: ${bp.small}px) {
    max-width: 100%;
    flex: 100%;
    height: auto;

    a {
      font-size: var(--mi-font-size-small) !important;
      overflow: hidden;
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
