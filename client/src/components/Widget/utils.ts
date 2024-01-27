import styled from "@emotion/styled";

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
  padding: 0.5rem;
  ${(props) => props.embeddedInMirlo && "min-height: 154px;"}
  display: flex;
  flex-direction: column;
  align-items: space-between;
  justify-content: stretch;
  border-radius: 0.3rem;
  box-sizing: border-box;
  background: var(--mi-normal-background-color);
`;

export const FlexWrapper = styled.div`
  display: flex;
`;
