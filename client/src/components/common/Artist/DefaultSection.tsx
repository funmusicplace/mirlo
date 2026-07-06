import { renderArtistLinkButtons } from "components/ManageArtist/ArtistFormLinks";
import Roster from "pages/{artistId}/roster/Index";
import Merch from "pages/{artistId}/merch/Index";
import Posts from "pages/{artistId}/posts/Index";
import Releases from "pages/{artistId}/releases/Index";
import ArtistSupport from "pages/{artistId}/support/Index";
import React from "react";
import { TabId } from "utils/artistTabs";
import { transformFromLinks } from "utils/links";

const sectionComponents: Record<TabId, React.FC> = {
  roster: Roster,
  releases: Releases,
  posts: Posts,
  support: ArtistSupport,
  merch: Merch,
};

type DefaultSectionProps = {
  artist: Artist;
  defaultSectionId?: TabId;
};

/**
 * Content shown at the artist's home URL (`/:artistId`). Rather than
 * redirecting to whichever section "has something" (which caused a flash and
 * could bounce visitors onto the standalone links page), we render the first
 * content-bearing section inline. Each section component self-hides when empty,
 * so nothing empty is ever shown. When no section has content we surface the
 * artist's links so links-only (and announcement-only) artists still land on a
 * real page.
 */
export default function DefaultSection({
  artist,
  defaultSectionId,
}: DefaultSectionProps) {
  if (defaultSectionId) {
    const Section = sectionComponents[defaultSectionId];
    return <Section />;
  }

  const allLinks = transformFromLinks(artist).linkArray;
  if (allLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {renderArtistLinkButtons(allLinks)}
    </div>
  );
}
