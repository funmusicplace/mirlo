import { css, injectGlobal } from "@emotion/css";
import Snackbar from "components/common/Snackbar";
import React, { useContext, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import SnackbarContext from "state/SnackbarContext";
import Header from "./components/Header";

injectGlobal`
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

  @media (prefers-color-scheme: dark) {
    body {
      background: #333;
      color: white;
    }
  }

  html {
    font-size: 18px;
  }

  h1 {
    font-size: 3rem;
  }

  h2 {
    font-size: 2.5rem;
  }

  h3 {
    font-size: 1.8rem;
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
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const userId = state.user?.id;

  React.useEffect(() => {
    const callback = async () => {
      console.log("calling callback");
      try {
        await api.post("refresh", {});
        const user = await api.get<LoggedInUser>("profile");
        dispatch({
          type: "setLoggedInUser",
          user,
        });
      } catch (e) {
        console.error("Error refreshing token", e);
        dispatch({
          type: "setLoggedInUser",
          user: undefined,
        });
        navigate("/login");
      } finally {
        setIsLoading(false);
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
  }, [userId, dispatch, navigate]);

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
      `}
    >
      {isDisplayed && <Snackbar />}
      {isLoading && <>Loading...</>}
      {!isLoading && (
        <>
          <Header />
          <Outlet />
        </>
      )}
    </div>
  );
}

export default App;
