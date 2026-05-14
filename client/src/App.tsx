import { css } from "@emotion/css";
import ArtistColorsProvider from "components/ArtistColorsProvider";
import PageBackground from "components/common/ArtistBackground";
import FailedSubscriptionBanner from "components/common/FailedSubscriptionBanner";
import { MetaCard } from "components/common/MetaCard";
import ReloadPrompt from "components/common/ReloadPrompt";
import Snackbar from "components/common/Snackbar";
import UploadProgressPanel from "components/common/UploadProgressPanel";
import UserBanner from "components/common/UserBanner";
import CookieDisclaimer from "components/CookieDisclaimer";
import { Footer } from "components/Footer";
import ManageArtistButtons from "components/ManageArtist/ManageArtistButtons";
import Player from "components/Player";
import ScrollToTop from "components/ScrollToTop";
import { useContext, useEffect } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import SnackbarContext, { useSnackbar } from "state/SnackbarContext";
import { useGlobalPlayerSyncIntegration } from "utils/playerSync";

import Header from "./components/Header/Header";
import { bp } from "./constants";

function App() {
  const { isDisplayed } = useContext(SnackbarContext);
  useGlobalPlayerSyncIntegration();
  const location = useLocation();
  const snackbar = useSnackbar();
  const [search, setSearch] = useSearchParams();
  const { user } = useAuthContext();

  const isWidget = location.pathname.includes("widget");

  useEffect(() => {
    if (isWidget) {
      document.documentElement.dataset.widget = "true";
      return () => {
        delete document.documentElement.dataset.widget;
      };
    }
  }, [isWidget]);

  if (isWidget) {
    return <Outlet />;
  }

  useEffect(() => {
    if (search.get("message")) {
      const message = search.get("message");
      if (message) {
        snackbar(message, { type: "warning" });
        setSearch((prev) => {
          prev.delete("message");
          return prev;
        });
      }
    }
  }, [search]);

  useEffect(() => {
    const h1 = document.querySelector("h1");
    const tabIndex = h1?.getAttribute("tabindex");
    h1?.setAttribute("tabindex", tabIndex ?? "-1");
    h1?.focus();
  }, [location]);

  return (
    <>
      <ScrollToTop />
      <MetaCard
        title="Mirlo"
        description="A music distribution and patronage site"
        image="/default-meta-image.webp"
      />
      <ArtistColorsProvider>
        <>
          {/* <Snackbar /> */}
          {isDisplayed && <Snackbar />}

          <Header />
          <ReloadPrompt />
          <FailedSubscriptionBanner />
          <CookieDisclaimer />
          <div
            className={css`
              @media screen and (max-width: ${bp.medium}px) {
                ${user ? "display: none !important;" : ""}
              }
            `}
          >
            <PageBackground />
            <UserBanner />
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
            <ManageArtistButtons />
            <div className="w-full flex flex-col min-h-screen">
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
          </div>
        </>
      </ArtistColorsProvider>
      <Player />
      <UploadProgressPanel />
    </>
  );
}

export default App;
