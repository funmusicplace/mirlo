import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

Object.assign(import.meta.env, { VITE_API_DOMAIN: "http://localhost:3000" });

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const featuredRelease = {
  id: 1,
  title: "Example Album",
  urlSlug: "example-album",
  artist: {
    id: 1,
    name: "Example Artist",
    urlSlug: "example-artist",
  },
  cover: {
    sizes: {
      300: "/images/example-album.jpg",
    },
  },
  tracks: [
    { id: 1 },
  ],
};

const popularRelease = {
  ...featuredRelease,
  id: 2,
  title: "Popular Album",
  urlSlug: "popular-album",
  artist: {
    ...featuredRelease.artist,
    id: 2,
    name: "Popular Artist",
    urlSlug: "popular-artist",
  },
};

const posts = [
  {
    id: 1,
    title: "Welcome to Mirlo",
    urlSlug: "welcome-to-mirlo",
    body: "",
    author: { name: "Team Mirlo" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url.includes("/auth/profile")) {
    return jsonResponse({ result: null });
  }

  if (url.includes("/v1/trackGroups/topSold")) {
    return jsonResponse({ results: [popularRelease], total: 1 });
  }

  if (url.includes("/v1/trackGroups")) {
    return jsonResponse({ results: [featuredRelease], total: 1 });
  }

  if (url.includes("/v1/tags")) {
    return jsonResponse({ results: [{ tag: "experimental" }], total: 1 });
  }

  if (url.includes("/v1/posts")) {
    return jsonResponse({ results: posts, total: posts.length });
  }

  if (url.includes("/v1/settings/instanceArtist")) {
    return jsonResponse({ result: { id: 1, name: "Mirlo", urlSlug: "mirlo" } });
  }

  if (url.includes("/v1/playable")) {
    return jsonResponse({ results: [], total: 0 });
  }

  const artistMatch = url.match(/\/v1\/artists\/(.+?)(?:[?\/]|$)/);
  if (artistMatch) {
    const slug = artistMatch[1];
    const id = slug === "popular-artist" ? 2 : 1;
    return jsonResponse({
      result: {
        id,
        name: slug
          .split("-")
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" "),
        urlSlug: slug,
      },
    });
  }

  return jsonResponse({ result: null });
});

vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  cleanup();
  fetchMock.mockClear();
});

vi.stubGlobal("scrollTo", vi.fn());
