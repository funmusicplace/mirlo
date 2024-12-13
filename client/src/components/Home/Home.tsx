import { css } from "@emotion/css";
import { bp } from "../../constants";
import Releases from "./HomeReleases";
import styled from "@emotion/styled";
import Splash from "./Splash";
import Posts from "./Posts";
import SupportMirlo from "./SupportMirlo";
import Animation from "./Animation";

export const SectionHeader = styled.div<{ userId?: number }>`
  position: sticky !important;
  padding-bottom: 0;
  line-height: 1rem;
  background-color: var(--mi-normal-background-color);
  z-index: 5;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  width: 100%;
  ${(props) =>
    !props.userId ? "top: -0.1rem; padding: .85rem 0 .65rem 0;" : ""}

  .section-header__heading {
    text-transform: uppercase;
    margin: var(--mi-side-paddings-xsmall);
    font-weight: normal;
    color: var(--mi-pink);
    padding-bottom: 0 !important;
  }

  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-normal-background-color);
    .section-header__heading {
      color: pink;
    }
  }

  @media screen and (max-width: ${bp.medium}px) {
    top: -0.1rem;
    .section-header__heading {
      margin: var(--mi-side-paddings-xsmall);
    }
  }
`;

function Home() {
  return (
    <div
      className={css`
        flex-direction: column;
        display: flex;
        align-items: center;
        width: 100%;
        margin-bottom: 5rem;

        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 3rem;
        }
      `}
    >
      {/* <Animation /> */}
      <Splash />
      <Releases />
      <SupportMirlo />
      <Posts />
    </div>
  );
}

export default Home;
