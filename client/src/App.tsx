import { css } from "@emotion/css";
import PageHeader from "components/common/PageHeader";
import Snackbar from "components/common/Snackbar";
import Player from "components/Player";
import { useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SnackbarContext from "state/SnackbarContext";
import useWidgetListener from "utils/useWidgetListener";
import Header from "./components/Header/Header";
import { Footer } from "components/Footer";
import { bp } from "./constants";
import { MetaCard } from "components/common/MetaCard";
import ArtistColorsWrapper from "components/ArtistColorsWrapper";
import CookieDisclaimer from "components/CookieDisclaimer";
import { useAuthContext } from "state/AuthContext";
import ScrollToTop from "components/ScrollToTop";

function App() {
  const { isDisplayed } = useContext(SnackbarContext);
  useWidgetListener();
  const location = useLocation();
  const { user } = useAuthContext();

  // In the case of a widget we don't show all the wrapper stuff
  if (location.pathname.includes("widget")) {
    return <Outlet />;
  }

  return (
    <>
      <ScrollToTop />
      <MetaCard
        title="Mirlo"
        description="A music distribution and patronage site"
        image="/android-chrome-512x512.png"
      />
      <ArtistColorsWrapper>
        <>
          {/* <Snackbar /> */}
          {isDisplayed && <Snackbar />}

          <Header />
          <CookieDisclaimer />
          <div
            className={css`
              @media screen and (max-width: ${bp.medium}px) {
                ${user ? "display: none !important;" : ""}
              }
            `}
          >
            <PageHeader />
          </div>
          <div
            className={css`
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              padding-bottom: 65px;
              min-height: calc(100vh - 65px);
            `}
          >
            <div
              className={css`
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                width: 100%;
              `}
            >
              <div
                className={css`
                  margin: 0 auto;
                  width: 100%;
                  border-radius: var(--mi-border-radius);
                  display: flex;
                  justify-content: center;
                  z-index: 1;
                  ${user ? "display: flex;" : ""}
                  flex-grow: 1;
                `}
              >
                <Outlet />
              </div>
              <Footer />
            </div>

            <Player />
          </div>
        </>
      </ArtistColorsWrapper>
    </>
  );
}

export default App;
