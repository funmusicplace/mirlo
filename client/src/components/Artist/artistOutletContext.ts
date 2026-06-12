import { TabId } from "utils/artistTabs";

export type ArtistOutletContext = {
  openTipModal: () => void;
  // The section rendered at the artist's home URL (`/:artistId`) — the first
  // tab that has content. Undefined when no section has content.
  defaultSectionId?: TabId;
};
