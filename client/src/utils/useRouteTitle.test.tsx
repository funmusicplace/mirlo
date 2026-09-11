import { render, waitFor } from "@testing-library/react";
import { MetaCard } from "components/common/MetaCard";
import React from "react";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import * as en from "translation/en.json";
import { describe, expect, it } from "vitest";

import useRouteTitle from "./useRouteTitle";

import "i18n";

const titles = (en as unknown as { pageTitles: Record<string, string> })
  .pageTitles;

const AppShell: React.FC = () => {
  const routeTitle = useRouteTitle();

  return (
    <>
      <MetaCard title={routeTitle ?? "Mirlo"} description="" />
      <Outlet />
    </>
  );
};

const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { path: "untitled", element: <div /> },
      {
        path: "profile",
        handle: { title: "collection" },
        element: <Outlet />,
        children: [
          {
            path: "wishlist",
            handle: { title: "wishlist" },
            element: <div />,
          },
        ],
      },
      {
        path: "release",
        handle: { title: "release" },
        // A page that knows something more specific than its route does.
        element: <MetaCard title="Some Album" description="" />,
      },
    ],
  },
];

const renderAt = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { initialEntries: [path] })}
    />
  );

describe("useRouteTitle", () => {
  it("falls back to the site name when no route declares a title", async () => {
    renderAt("/untitled");

    await waitFor(() => expect(document.title).toBe("Mirlo"));
  });

  it("uses the matched route's title", async () => {
    renderAt("/profile");

    await waitFor(() =>
      expect(document.title).toBe(`${titles.collection} | Mirlo`)
    );
  });

  it("prefers the deepest matched route's title", async () => {
    renderAt("/profile/wishlist");

    await waitFor(() =>
      expect(document.title).toBe(`${titles.wishlist} | Mirlo`)
    );
  });

  it("lets a page's own MetaCard win over the route title", async () => {
    renderAt("/release");

    await waitFor(() => expect(document.title).toBe("Some Album | Mirlo"));
  });
});
