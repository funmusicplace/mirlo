/**
 * The app chrome the showcase stories render pages inside: a trimmed-down
 * App shell (header, artist colours and background, optionally the player),
 * without the footer, cookie banner and other chrome that would clutter a
 * recording.
 */
import type { Decorator } from "@storybook/react";
import ArtistColorsProvider from "components/ArtistColorsProvider";
import PageBackground from "components/common/ArtistBackground";
import Header from "components/Header/Header";
import Player from "components/Player";
import { http, HttpResponse } from "msw";
import ManageArtistLayout from "pages/manage/artists/{artistId}/Layout";
import ArtistIndex from "pages/{artistId}/Index";
import ArtistLayout from "pages/{artistId}/Layout";
import ArtistMerch from "pages/{artistId}/merch/Index";
import ArtistMerchItem from "pages/{artistId}/merch/{merchId}/Index";
import ArtistPosts from "pages/{artistId}/posts/Index";
import ArtistPost from "pages/{artistId}/posts/{postId}/Index";
import ReleasePage from "pages/{artistId}/release/{trackGroupId}/Index";
import TrackPage from "pages/{artistId}/release/{trackGroupId}/tracks/{trackId}/Index";
import ArtistReleases from "pages/{artistId}/releases/Index";
import ArtistSupport from "pages/{artistId}/support/Index";
import ArtistTierPage from "pages/{artistId}/support/{tierId}/Index";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  reactRouterNestedAncestors,
  reactRouterParameters,
} from "storybook-addon-remix-react-router";
import type { RouterRoute } from "storybook-addon-remix-react-router";

import { SHOWCASE_ARTIST } from "./fixtures";

/**
 * Header, background and routed page, without the artist colours, for frames
 * that already sit inside an ArtistColorsProvider of their own.
 */
export const AppChrome: React.FC<{ player?: boolean }> = ({ player }) => {
  // storybook-addon-remix-react-router proxies RouteContext, which stops
  // nested <Outlet />s from seeing in-story navigation. Remounting the page
  // on each path change keeps links working while recording.
  const { pathname } = useLocation();
  return (
    <>
      <Header />
      <div className="hidden md:block">
        <PageBackground />
      </div>
      <div className="grow flex flex-col pb-[65px] min-h-[calc(100vh-65px)]">
        <div className="w-full flex flex-col min-h-screen">
          <main
            className="mx-auto w-full rounded-[var(--mi-border-radius)] flex justify-center z-[1] grow"
            id="main-content"
          >
            <Outlet key={pathname} />
          </main>
        </div>
      </div>
      {player && <Player />}
    </>
  );
};

/** The app chrome with the artist's colours applied */
export const AppFrame: React.FC<{ player?: boolean }> = ({ player }) => (
  <ArtistColorsProvider>
    <AppChrome player={player} />
  </ArtistColorsProvider>
);

/** The real `/:artistId` route tree from routes.tsx */
export const artistPageRoutes: RouterRoute[] = [
  {
    path: ":artistId",
    element: <ArtistLayout />,
    children: [
      {
        path: "",
        element: <ArtistIndex />,
        children: [
          { path: "releases", element: <ArtistReleases /> },
          { path: "posts", element: <ArtistPosts /> },
          { path: "support/:tierId", element: <ArtistTierPage /> },
          { path: "support", element: <ArtistSupport /> },
          { path: "merch", element: <ArtistMerch /> },
          { path: "merch/:merchId", element: <ArtistMerchItem /> },
        ],
      },
      { path: "posts/:postId", element: <ArtistPost /> },
      { path: "release/:trackGroupId", element: <ReleasePage /> },
      {
        path: "release/:trackGroupId/tracks/:trackId",
        element: <TrackPage />,
      },
    ],
  },
];

/**
 * Router parameters for a story whose component is AppFrame (or a frame
 * built on AppChrome): starts at `path`, and links between `routes` navigate
 * for real while recording.
 */
export const appRouting = (
  path: string,
  routes: RouterRoute[] = artistPageRoutes
) =>
  reactRouterParameters({
    location: { path },
    routing: { path: "/", useStoryElement: true, children: routes },
  });

/**
 * Renders the story inside the real manage-artist Layout, with the artist's
 * colours applied as the app does. `route` is the child route pattern (e.g.
 * "release/:trackGroupId"), `path` the concrete path (e.g. "release/71").
 */
export const manageArtistPage = (route: string, path: string = route) =>
  reactRouterParameters({
    location: { path: `/manage/artists/${SHOWCASE_ARTIST.id}/${path}` },
    routing: reactRouterNestedAncestors({ path: route }, [
      {
        path: "/manage/artists/:artistId",
        element: (
          <ArtistColorsProvider>
            <ManageArtistLayout />
          </ArtistColorsProvider>
        ),
      },
    ]),
  });

/** Endpoints the manage-artist Layout and announcement read. */
export const layoutHandlers = [
  http.get("*/v1/manage/artists/:artistId/labels", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/manage/artists/:artistId/managers", () =>
    HttpResponse.json({ results: [] })
  ),
];

/** A single page with the artist's colours, but no header */
export const withArtistColors: Decorator = (Story) => (
  <ArtistColorsProvider>
    <div className="min-h-screen pt-6">
      <Story />
    </div>
  </ArtistColorsProvider>
);
