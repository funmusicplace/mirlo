/** @jsxImportSource @emotion/react */
import { css } from "@emotion/css";
import { Global, css as reactCss } from "@emotion/react";
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

function App() {
  const { state, dispatch } = useGlobalStateContext();
  const { isDisplayed } = useContext(SnackbarContext);
  useWidgetListener();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = state.user?.id;
  const isPlaying = state.playerQueueIds;

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
    <>
      <MetaCard
        title="Mirlo"
        description="A music distribution and patronage site"
        image="/android-chrome-512x512.png"
      />
      <Global
        styles={(theme) => reactCss`
        html {
          --mi-pink: #BE3455;

          --mi-font-family-stack: 'Arial', -apple-system, BlinkMacSystemFont,
            'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans',
            'Droid Sans', 'Helvetica Neue', sans-serif;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        html {
          font-size: 20px;
          min-height: 100%;
        }
        
        body {
          margin: 0;
          background-color: ${theme.colors.background};
          color: ${theme.colors.text};
          font-family: var(--mi-font-family-stack);
          -webkit-font-smoothing: auto;
          -moz-osx-font-smoothing: auto;
        }
        
        body,
        #root {
          min-height: 100%;
        }
        
        h1 {
          font-size: 2.5rem;
          line-height: 2;
        
          a {
            text-decoration: none;
            color: black;
          }
        }
        
        h2 {
          font-size: 1.9rem;
          line-height: 1.5;
          margin-bottom: 0.4rem;
        }
        
        h3 {
          font-size: 1.7rem;
          padding-bottom: 1rem;
        }
        
        h4 { 
          font-size: 1.4rem;
          padding-bottom: .75rem;
        }
        
        h5 {
          font-size: 1.2rem;
          padding-bottom: .75rem;
        }
        
        h6 {
          font-size: 1.1rem;
          padding-bottom: .75rem;
        }
        
        @media (max-width: 800px) {
          h1 {
            font-size: 2rem;
          }
        
          h2 {
            font-size: 1.8rem;
          }
        }
        
        a {
          transition: .25s color, .25s background-color;
          color: ${theme.colors.primary};
        }
        
        @media (prefers-color-scheme: dark) {
          a {
            color: #F27D98;
          }
        }
        
        button {
          font-family: var(--mi-font-family-stack);
        }

        code {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
            monospace;
        }
        
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-3rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(3rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spinning {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}
      />
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
    </>
  );
}

export default App;
