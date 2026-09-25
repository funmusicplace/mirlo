import { ARTIST_EXAMPLE } from "./artist";

export const USER_EXAMPLE: LoggedInUser = {
  id: 1,
  email: "artist@example.com",
  name: "Example User",
  artists: [ARTIST_EXAMPLE],
  isAdmin: false,
  isLabelAccount: false,
};
