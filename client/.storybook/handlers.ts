import { http, HttpResponse } from "msw";

import type { ManagedArtist } from "../src/queries";
import { DEFAULT_INSTANCE_SETTINGS } from "../src/utils/instanceSettings";
import { USER_EXAMPLE } from "../test/mocks";

export const defaultHandlers = {
  auth: [
    http.get("*/auth/profile", () =>
      HttpResponse.json({ result: USER_EXAMPLE })
    ),
    http.post("*/auth/refresh", () => HttpResponse.json({})),
  ],
  settings: [
    http.get("*/v1/settings/isClosedToPublicArtistSignup", () =>
      HttpResponse.json({ result: false })
    ),
  ],
  instance: [
    http.get("*/v1/instance", () =>
      HttpResponse.json({ result: DEFAULT_INSTANCE_SETTINGS })
    ),
  ],
  stripe: stripeStatusHandlers({ chargesEnabled: true }),
};

export function stripeStatusHandlers({
  chargesEnabled,
}: {
  chargesEnabled: boolean;
}) {
  return [
    http.get("*/v1/users/:userId/stripe/checkAccountStatus", () =>
      HttpResponse.json({
        result: {
          chargesEnabled,
          detailsSubmitted: chargesEnabled,
          stripeAccountId: "acct_1",
        } satisfies AccountStatus,
      })
    ),
  ];
}

export function managedArtistsHandler(artists: ManagedArtist[]) {
  return http.get("*/v1/manage/artists", () =>
    HttpResponse.json({ results: artists })
  );
}

export function artistHandlers(
  artist: Artist | (() => Artist),
  {
    relationship = "owner",
  }: { relationship?: ManagedArtist["relationship"] | null } = {}
) {
  const current = typeof artist === "function" ? artist : () => artist;
  return [
    http.get("*/v1/manage/artists", () =>
      HttpResponse.json({
        results: relationship ? [{ ...current(), relationship }] : [],
      })
    ),
    http.get("*/v1/manage/artists/:artistId", () =>
      HttpResponse.json({ result: current() })
    ),
    http.get("*/v1/artists/:artistSlug", () =>
      HttpResponse.json({ result: current() })
    ),
  ];
}
