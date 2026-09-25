import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";
import { initialize, mswLoader } from "msw-storybook-addon";
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  withRouter,
  reactRouterParameters,
} from "storybook-addon-remix-react-router";

import {
  queryClient,
  QueryClientWrapper,
} from "../src/queries/QueryClientWrapper";
import { AuthContextProvider } from "../src/state/AuthContext";
import { GlobalStateProvider } from "../src/state/GlobalState";
import { SnackBarContextProvider } from "../src/state/SnackbarContext";
import { UploadContextProvider } from "../src/state/UploadContext";

import "../src/i18n";
import "../src/styles/index.css";
import "./global.css";
import { defaultHandlers } from "./handlers";

// Requests with no matching handler fall through to the network, which in
// Storybook usually means a failed request to a local API that isn't running.
// Warn so a missing mock is easy to spot in the console.
initialize({ onUnhandledRequest: "warn" });

function RouterErrorHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // If a component links to an invalid route, it'll reach this error handler
    // - which just navigates back to the previous state
    navigate(-1);
  }, []);

  return null;
}

// Mirrors the provider stack in src/index.tsx
function withGlobalContext(Outlet: any) {
  return (
    <QueryClientWrapper devTools={false}>
      <AuthContextProvider>
        <GlobalStateProvider>
          <SnackBarContextProvider>
            <UploadContextProvider>
              <Outlet />
            </UploadContextProvider>
          </SnackBarContextProvider>
        </GlobalStateProvider>
      </AuthContextProvider>
    </QueryClientWrapper>
  );
}

// The app's query client is a module-level singleton, so without this each
// story would render whatever the previously viewed story cached.
const clearQueryCache = async () => {
  queryClient.clear();
  return {};
};

const preview: Preview = {
  loaders: [clearQueryCache, mswLoader],
  decorators: [
    withRouter,
    withGlobalContext,
    withThemeByDataAttribute({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "data-mi-theme",
    }),
  ],
  parameters: {
    msw: { handlers: defaultHandlers },
    reactRouter: reactRouterParameters({
      routing: {
        path: "/",
        errorElement: <RouterErrorHandler />,
      },
    }),
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
