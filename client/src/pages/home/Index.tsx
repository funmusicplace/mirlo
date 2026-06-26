import { css } from "@emotion/css";

import Announcement from "components/Home/Announcement";
import HomeReleases from "components/Home/HomeReleases";
import NewsletterSignup from "components/Home/NewsletterSignup";
import Splash from "components/Home/Splash";
import SupportMirlo from "components/Home/SupportMirlo";

import { bp } from "../../constants";

function Index() {
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
      <HomeReleases />
      <SupportMirlo />
      <NewsletterSignup />
    </div>
  );
}

export default Index;
