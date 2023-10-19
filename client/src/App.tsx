/** @jsxImportSource @emotion/react */
import { css } from "@emotion/css";
import { css as reactCss } from "@emotion/react";
import PageHeader from "components/common/PageHeader";
import Snackbar from "components/common/Snackbar";
import Player from "components/Player";
import React, { useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import SnackbarContext from "state/SnackbarContext";
import useWidgetListener from "utils/useWidgetListener";
import Header from "./components/Header/Header";
import { Footer } from "components/Footer";
import { bp } from "./constants";
import { MetaCard } from "components/common/MetaCard";
import GlobalStyles from "components/GlobalStyles";
import { ThemeProvider } from "@emotion/react";
import mirloTheme from "utils/theme";

function App() {
  const { state, dispatch } = useGlobalStateContext();
  const { isDisplayed } = useContext(SnackbarContext);
  const [theme, setTheme] = React.useState(
    window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? mirloTheme.dark
      : mirloTheme.light
  );
  useWidgetListener();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = state.user?.id;
  const isPlaying = state.playerQueueIds;

  React.useEffect(() => {
    function handleChangeColorScheme(event: MediaQueryListEvent) {
      if (event.matches) {
        setTheme(mirloTheme.dark);
      } else {
        setTheme(mirloTheme.light);
      }
    }
    window.matchMedia &&
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", handleChangeColorScheme);
    return () => {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", handleChangeColorScheme);
    };
  });

  React.useEffect(() => {
    const callback = async () => {
      try {
        await api.post("refresh", {});
        const user = await api.get<LoggedInUser>("profile");
        dispatch({
          type: "setLoggedInUser",
          user: user.result,
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes("NetworkError")) {
          console.error(
            "Problem with the network, gonna just do nothing for now, we might want to throw up an error in the future"
          );
          setTimeout(callback, 1000 * 10);
        } else {
          console.error("Error refreshing token", e);
          dispatch({
            type: "setLoggedInUser",
            user: undefined,
          });
          // if (
          //   !(
          //     location.pathname.includes("login") ||
          //     location.pathname.includes("signup")
          //   )
          // ) {
          //   navigate("/login");
          // }
        }
      }
    };

    callback();
    let interval: NodeJS.Timer | null = null;

    if (userId) {
      interval = setInterval(async () => {
        callback();
      }, 1000 * 60 * 5); // refresh every 5 minutes
    }
    return () => (interval ? clearInterval(interval) : undefined);
  }, [userId, dispatch, navigate, location.pathname]);

  // In the case of a widget we don't show all the wrapper stuff
  if (location.pathname.includes("widget")) {
    return <Outlet />;
  }

  return (
    <ThemeProvider theme={theme}>
      <MetaCard
        title="Mirlo"
        description="A music distribution and patronage site"
        image="/android-chrome-512x512.png"
      />
      <GlobalStyles />
      <div
        className={css`
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        `}
      >
        {isDisplayed && <Snackbar />}

        <Header />

        <PageHeader />
        <div
          className={css`
            flex-grow: 1;
            display: flex;
            flex-direction: column;

            ${isPlaying
              ? `
            padding-bottom: 130px;`
              : ``}
          `}
        >
          <div
            css={(theme) => reactCss`
              margin: 0 auto;
              width: 100%;
              border-radius: ${theme.borderRadius};
              display: flex;
              ${userId ? "display: flex;" : ""}
              flex-grow: 1;

              @media (min-width: ${bp.small}px) {
                padding: 1rem 2rem 2rem;
                max-width: 1080px;
              }

              @media screen and (max-width: 800px) {
                padding: 1rem 1rem 1rem;
              }
            `}
          >
            <Outlet />
          </div>
          <Footer />
        </div>

        <Player />
      </div>
    </ThemeProvider>
  );
}

export default App;
