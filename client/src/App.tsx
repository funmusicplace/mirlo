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
import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import ScrollToTop from "components/ScrollToTop";
import { useContext, useEffect } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import SnackbarContext, { useSnackbar } from "state/SnackbarContext";
import { useGlobalPlayerSyncIntegration } from "utils/playerSync";
import { isEmpty } from "lodash";
import { useTranslation } from "react-i18next";

import Header from "./components/Header/Header";
import { bp } from "./constants";

function App() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { isDisplayed } = useContext(SnackbarContext);
  useGlobalPlayerSyncIntegration();
  const location = useLocation();
  const snackbar = useSnackbar();
  const [search, setSearch] = useSearchParams();
  const { user } = useAuthContext();
  const { currentTrack } = useCurrentTrackHook();

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

  const isPlayerVisible = !(!currentTrack || isEmpty(currentTrack.trackGroup));

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
          <div className="sr-only focus-within:not-sr-only flex gap-4 m-1!">
            <a href="#main-content">{t("skipToMainContent")}</a>
            {isPlayerVisible && <a href="#player">{t("skipToAudioPlayer")}</a>}
          </div>
          <Header />
          <ReloadPrompt />
          <FailedSubscriptionBanner />
          <CookieDisclaimer />
          <div
            className={css`
              @media screen and (max-width: ${bp.medium}px) {
                display: none !important;
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
              <main
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
                id="main-content"
              >
                <Outlet />
              </main>
              <Footer />
            </div>
          </div>
          <Player />
        </>
      </ArtistColorsProvider>
      <UploadProgressPanel />
    </>
  );
}

export default App;
