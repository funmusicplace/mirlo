import { type RouteObject } from "react-router-dom";
import { describe, expect, test } from "vitest";

import reservedProfileSlugs from "../../src/utils/reservedProfileSlugs";

import routes from "./routes";

const topLevelSegments = (routeObjects: RouteObject[]): string[] =>
  routeObjects.flatMap((route) => {
    const [first] = (route.path ?? "").replace(/^\//, "").split("/");
    return first ? [first] : topLevelSegments(route.children ?? []);
  });

describe("routes", () => {
  test("every top-level route is a reserved profile slug", () => {
    const unreserved = topLevelSegments(routes).filter(
      (segment) =>
        !segment.startsWith(":") &&
        !reservedProfileSlugs.includes(segment.toLowerCase())
    );

    expect(unreserved).toEqual([]);
  });
});
