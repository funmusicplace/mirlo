import type { Preview } from "@storybook/react";
import {
  withRouter,
  reactRouterParameters,
} from "storybook-addon-remix-react-router";
import React from "react";
import { useNavigate } from "react-router-dom";
import { withThemeByDataAttribute } from "@storybook/addon-themes";

import { GlobalStateProvider } from "../src/state/GlobalState";
import { QueryClientWrapper } from "../src/queries/QueryClientWrapper";
import "../src/styles/index.css";
import "./global.css";

function RouterErrorHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // If a component links to an invalid route, it'll reach this error handler
    // - which just navigates back to the previous state
    navigate(-1);
  }, []);

  return null;
}

function withGlobalContext(Outlet: any) {
  return (
    <GlobalStateProvider>
      <QueryClientWrapper devTools={false}>
        <Outlet />
      </QueryClientWrapper>
    </GlobalStateProvider>
  );
}

const preview: Preview = {
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
