import type { Preview } from "@storybook/react";
import { configure } from "@storybook/test";
import { initialize, mswLoader } from "msw-storybook-addon";
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  withRouter,
  reactRouterParameters,
} from "storybook-addon-remix-react-router";

import { ConfirmDialog } from "../src/components/common/ConfirmDialog";
import Snackbar from "../src/components/common/Snackbar";
import { initI18n } from "../src/i18n";
import {
  queryClient,
  QueryClientWrapper,
} from "../src/queries/QueryClientWrapper";
import { AuthContextProvider } from "../src/state/AuthContext";
import { GlobalStateProvider } from "../src/state/GlobalState";
import SnackbarContext, {
  SnackBarContextProvider,
} from "../src/state/SnackbarContext";
import { UploadContextProvider } from "../src/state/UploadContext";
import {
  applyInstanceStyles,
  DEFAULT_INSTANCE_SETTINGS,
} from "../src/utils/instanceSettings";
import { ConfirmContextProvider } from "../src/utils/useConfirm";

import "../src/styles/index.css";
import "./global.css";
import { defaultHandlers } from "./handlers";
import { resetPurchaseMock } from "./purchaseHandlers";
import { resetStripeMock } from "./stripeMock";

void initI18n();

applyInstanceStyles(DEFAULT_INSTANCE_SETTINGS);

initialize({ onUnhandledRequest: "warn" });

configure({ asyncUtilTimeout: 5000 });

function RouterErrorHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate(-1);
  }, []);

  return null;
}

function SnackbarOutlet() {
  const { isDisplayed } = React.useContext(SnackbarContext);
  return isDisplayed ? <Snackbar /> : null;
}

function withGlobalContext(Outlet: any) {
  return (
    <QueryClientWrapper devTools={false}>
      <AuthContextProvider>
        <GlobalStateProvider>
          <ConfirmContextProvider>
            <ConfirmDialog />
            <SnackBarContextProvider>
              <UploadContextProvider>
                <Outlet />
                <SnackbarOutlet />
              </UploadContextProvider>
            </SnackBarContextProvider>
          </ConfirmContextProvider>
        </GlobalStateProvider>
      </AuthContextProvider>
    </QueryClientWrapper>
  );
}

const resetStoryState = async () => {
  queryClient.clear();
  resetStripeMock();
  resetPurchaseMock();
  return {};
};

const preview: Preview = {
  loaders: [resetStoryState, mswLoader],
  decorators: [withRouter, withGlobalContext],
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
