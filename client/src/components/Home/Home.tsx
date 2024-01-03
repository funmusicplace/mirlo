import { css } from "@emotion/css";
import { bp } from "../../constants";
import React from "react";
import { useGlobalStateContext } from "state/GlobalState";
import Releases from "./HomeReleases";
import styled from "@emotion/styled";
import Splash from "./Splash";
import Posts from "./Posts";

export const SectionHeader = styled.div<{ userId?: number }>`
  position: sticky !important;
  padding-bottom: 0;
  line-height: 1rem;
  background-color: var(--mi-normal-background-color);
  z-index: 5;
  margin-top: 0.25rem;
  width: 100%;
  ${(props) =>
    !props.userId ? "top: -0.1rem; padding: .85rem 0 .65rem 0;" : ""}

  h5 {
    text-transform: uppercase;
    margin: var(--mi-side-paddings-xsmall);
    font-weight: normal;
    color: var(--mi-pink);
    padding-bottom: 0 !important;
  }

  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-normal-background-color);
    h5 {
      color: pink;
    }
  }

  @media screen and (max-width: ${bp.medium}px) {
    top: -0.1rem;
    h5 {
      margin: var(--mi-side-paddings-xsmall);
    }
  }
`;

function Home() {
  const {
    state: { user },
  } = useGlobalStateContext();

  return (
    <div
      className={css`
        flex-direction: column;
        display: flex;
        align-items: center;
        width: 100%;
      `}
    >
      {!user && <Splash />}

      <Releases />
      <Posts />
    </div>
  );
}

export default Home;
