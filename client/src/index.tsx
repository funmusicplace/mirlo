import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// When a deploy lands and the SW has cleaned old chunk URLs, lazy-loaded
// modules 404. Reloading fetches fresh HTML + the new SW's precached chunks.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

import "./styles/index.css";
import "./i18n";

import routes from "routes";
import { AuthContextProvider } from "state/AuthContext";
import { SnackBarContextProvider } from "state/SnackbarContext";
import { UploadContextProvider } from "state/UploadContext";
import { ConfirmContextProvider } from "utils/useConfirm";

import { GlobalStateProvider } from "./state/GlobalState";

import { QueryClientWrapper } from "queries/QueryClientWrapper";
import { ConfirmDialog } from "components/common/ConfirmDialog";

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
              <UploadContextProvider>
                <RouterProvider router={router} />
              </UploadContextProvider>
            </SnackBarContextProvider>
          </ConfirmContextProvider>
        </GlobalStateProvider>
      </AuthContextProvider>
    </QueryClientWrapper>
  </React.StrictMode>
);
