import { css } from "@emotion/css";
import { bp } from "../../constants";
import Releases from "./HomeReleases";
import styled from "@emotion/styled";
import Splash from "./Splash";
import Posts from "./Posts";
import SupportMirlo from "./SupportMirlo";
import Announcement from "./Announcement";
import NewsletterSignup from "./NewsletterSignup";

export const SectionHeader = styled.div<{ userId?: number }>`
  padding-bottom: 0;
  line-height: 1rem;
  z-index: 5;
  margin-top: 2rem;
  margin-bottom: 0.25rem;
  width: 100%;
  ${(props) =>
    !props.userId ? "top: -0.1rem; padding: .85rem 0 .65rem 0;" : ""}

  .section-header__heading {
    text-transform: uppercase;
    margin: var(--mi-side-paddings-xsmall);
    font-weight: normal;
    color: var(--mi-primary-color);
    padding-bottom: 0 !important;
    display: inline-block;
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
      <Announcement />
      <Splash />
      <Releases />
      <SupportMirlo />
      <Posts />
      <NewsletterSignup />
    </div>
  );
}

export default Home;
