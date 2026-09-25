import { http, HttpResponse } from "msw";

import { USER_EXAMPLE } from "../test/mocks";

/**
 * Handlers every story gets. They're keyed so a story can replace one group
 * without dropping the rest, e.g. a logged-out story:
 *
 *   parameters: {
 *     msw: {
 *       handlers: {
 *         auth: http.get("*\/auth/profile", () => new HttpResponse(null, { status: 401 })),
 *       },
 *     },
 *   }
 */
export const defaultHandlers = {
  auth: [
    http.get("*/auth/profile", () =>
      HttpResponse.json({ result: USER_EXAMPLE })
    ),
    http.post("*/auth/refresh", () => HttpResponse.json({})),
  ],
};
