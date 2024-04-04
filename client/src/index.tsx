import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import reportWebVitals from "./reportWebVitals";
import "./i18n";

import { GlobalStateProvider } from "./state/GlobalState";

import { SnackBarContextProvider } from "state/SnackbarContext";
import { ThemeProvider } from "@emotion/react";
import { theme } from "utils/theme";
import routes from "routes";
import { QueryClientWrapper } from "queries/QueryClientWrapper";
import { AuthContextProvider } from "state/AuthContext";

const router = createBrowserRouter(routes);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientWrapper>
      <AuthContextProvider>
        <ThemeProvider theme={theme}>
          <GlobalStateProvider>
            <SnackBarContextProvider>
              <RouterProvider router={router} />
            </SnackBarContextProvider>
          </GlobalStateProvider>
        </ThemeProvider>
      </AuthContextProvider>
    </QueryClientWrapper>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
