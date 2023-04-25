import { css, injectGlobal } from "@emotion/css";
import LoadingSpinner from "components/common/LoadingSpinner";
import PageHeader from "components/common/PageHeader";
import Snackbar from "components/common/Snackbar";
import Player from "components/Player";
import React, { useContext, useState } from "react";
import { Helmet } from "react-helmet";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import SnackbarContext from "state/SnackbarContext";
import useWidgetListener from "utils/useWidgetListener";
import Header from "./components/Header/Header";

injectGlobal`
  html {
    --mi-normal-background-color: white;
    --mi-normal-foreground-color: #333;

    --mi-primary-color: #0096a8;
    --mi-primary-color--hover: #00C4DB;
    --mi-secondary-color: #ffb3d0;
    --mi-secondary-color--hover: #FF80B0;

    --mi-warning-background-color: #f04e37;
    --mi-warning-foreground-color: white;

    --mi-primary-highlight-color: #bcb3ff;
    --mi-primary-highlight-color--hover: #FFB3D0;

    --mi-shade-background-color: rgba(0, 0, 0, .1);
    --mi-lighten-background-color: rgba(255, 255, 255, 0.2);

    --mi-border-radius: .5rem;
    
    --mi-icon-button-background-color: var(--mi-shade-background-color);
    --mi-icon-button-background-color--hover: rgba(0, 0, 0, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    html {
      background: blue;
      --mi-normal-background-color: #333;
      --mi-normal-foreground-color: white;
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  @font-face {
    font-family: 'Patrick Hand SC';
    font-style: normal;
    font-weight: 400;
    src: local('Patrick Hand SC'),
      local('PatrickHandSC-Regular'),
      url(https://fonts.gstatic.com/s/patrickhandsc/v4/OYFWCgfCR-7uHIovjUZXsZ71Uis0Qeb9Gqo8IZV7ckE.woff2)
        format('woff2');
    unicode-range: U+0100-024f, U+1-1eff,
      U+20a0-20ab, U+20ad-20cf, U+2c60-2c7f,
      U+A720-A7FF;
  }

  html {
    font-size: 18px;
    min-height: 100%;
  }

  body {
    background-color: var(--mi-normal-background-color);
    color: var(--mi-normal-foreground-color);
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
    font-size: 2rem;
    line-height: 1.5;
    margin-bottom: 0.25rem;
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

  a {
    transition: .25s color, .25s background-color;
    color: var(--mi-primary-color);
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
`;

function App() {
  const { state, dispatch } = useGlobalStateContext();
  const { isDisplayed } = useContext(SnackbarContext);
  useWidgetListener();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = state.user?.id;

  React.useEffect(() => {
    const callback = async () => {
      try {
        await api.post("refresh", {});
        const user = await api.get<LoggedInUser>("profile");
        dispatch({
          type: "setLoggedInUser",
          user: user.result,
        });
        setIsLoading(false);
      } catch (e) {
        if (e instanceof Error && e.message.includes("NetworkError")) {
          console.error(
            "Problem with the network, gonna just do nothing for now, we might want to throw up an error in the future"
          );
          setTimeout(callback, 1000 * 10);
        } else {
          setIsLoading(false);
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

  const isArtistPage = location.pathname.includes("artist");

  return (
    <>
      <Helmet>
        <title>A Mirlo Space</title>
        <meta name="description" content="A home for all of your music" />
      </Helmet>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          min-height: 100%;
        `}
      >
        {isDisplayed && <Snackbar />}
        {isLoading && (
          <div
            className={css`
              display: flex;
              height: 100vh;
              justify-content: center;
              align-items: center;
              font-size: 4rem;
            `}
          >
            <LoadingSpinner />
          </div>
        )}
        {!isLoading && (
          <>
            <Header />
            <PageHeader />
            <div
              className={css`
                max-width: 640px;
                background-color: var(--mi-normal-background-color);
                padding: 3rem 2rem 9rem;
                margin: 0 auto;
                width: 100%;
                ${isArtistPage
                  ? "box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.1);"
                  : ""}
                border-radius: var(--mi-border-radius);
              `}
            >
              <Outlet />
            </div>
            <Player />
          </>
        )}
      </div>
    </>
  );
}

export default App;
