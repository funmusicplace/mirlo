import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import App from "./App";

const { redirectState } = vi.hoisted(() => ({
  redirectState: { to: null as string | null },
}));

vi.mock("components/Setup/useSetupRedirect", async () => {
  const { useLocation } = await import("react-router-dom");
  return {
    default: () => {
      const { pathname } = useLocation();
      return pathname === redirectState.to ? null : redirectState.to;
    },
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("state/SnackbarContext", () => ({
  default: React.createContext({ isDisplayed: false }),
  useSnackbar: () => vi.fn(),
}));

vi.mock("queries/instanceSettings", () => ({
  useInstanceSettings: () => ({ name: "Nightjar Records" }),
}));

vi.mock("utils/instanceSettings", () => ({ applyInstanceStyles: vi.fn() }));
vi.mock("utils/playerSync", () => ({
  useGlobalPlayerSyncIntegration: vi.fn(),
}));
vi.mock("utils/useRouteTitle", () => ({ default: () => undefined }));
vi.mock("components/Player/useCurrentTrackHook", () => ({
  default: () => ({ currentTrack: undefined }),
}));

const { stub } = vi.hoisted(() => ({
  stub: () => ({ default: () => null }),
}));
vi.mock("components/ArtistColorsProvider", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("components/common/MetaCard", () => ({ MetaCard: () => null }));
vi.mock("components/Footer", () => ({ Footer: () => null }));
vi.mock("components/common/ArtistBackground", stub);
vi.mock("components/common/FailedSubscriptionBanner", stub);
vi.mock("components/common/ReloadPrompt", stub);
vi.mock("components/common/Snackbar", stub);
vi.mock("components/common/TranslationHelpBanner", stub);
vi.mock("components/common/UploadProgressPanel", stub);
vi.mock("components/common/UserBanner", stub);
vi.mock("components/CookieDisclaimer", stub);
vi.mock("components/ManageArtist/ManageArtistButtons", stub);
vi.mock("components/Player", stub);
vi.mock("components/ScrollToTop", stub);
vi.mock("./components/Header/Header", stub);

const tree = () => (
  <MemoryRouter initialEntries={["/"]}>
    <Routes>
      <Route element={<App />}>
        <Route index element={<p>home page</p>} />
        <Route path="/admin/setup" element={<p>setup guide</p>} />
      </Route>
    </Routes>
  </MemoryRouter>
);

describe("App", () => {
  test("redirects to the setup guide once the redirect resolves after the first render", () => {
    redirectState.to = null;
    const { rerender } = render(tree());
    expect(screen.getByText("home page")).toBeInTheDocument();

    redirectState.to = "/admin/setup";
    rerender(tree());

    expect(screen.getByText("setup guide")).toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });
});
