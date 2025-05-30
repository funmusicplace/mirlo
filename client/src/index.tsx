import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./styles/index.css";
import "./i18n";

import { GlobalStateProvider } from "./state/GlobalState";

import { SnackBarContextProvider } from "state/SnackbarContext";

import routes from "routes";
import { QueryClientWrapper } from "queries/QueryClientWrapper";
import { AuthContextProvider } from "state/AuthContext";
import { ConfirmContextProvider } from "utils/useConfirm";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import ScrollToTop from "components/ScrollToTop";

const router = createBrowserRouter(routes);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientWrapper>
      <AuthContextProvider>
        <GlobalStateProvider>
          <ConfirmContextProvider>
            <ConfirmDialog />
            <SnackBarContextProvider>
              <RouterProvider router={router} />
            </SnackBarContextProvider>
          </ConfirmContextProvider>
        </GlobalStateProvider>
      </AuthContextProvider>
    </QueryClientWrapper>
  </React.StrictMode>
);
