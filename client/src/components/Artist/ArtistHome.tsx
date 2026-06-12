import { useQuery } from "@tanstack/react-query";
import { renderArtistLinkButtons } from "components/ManageArtist/ArtistFormLinks";
import { queryArtist } from "queries";
import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { TabId } from "utils/artistTabs";
import { transformFromLinks } from "utils/links";

import Roster from "../Label/Roster";
import ArtistMerch from "../Merch/ArtistMerch";

import ArtistAlbums from "./ArtistAlbums";
import { ArtistOutletContext } from "./artistOutletContext";
import ArtistPosts from "./ArtistPosts";
import ArtistSupport from "./ArtistSupport";

const sectionComponents: Record<TabId, React.FC> = {
  roster: Roster,
  releases: ArtistAlbums,
  posts: ArtistPosts,
  support: ArtistSupport,
  merch: ArtistMerch,
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
const ArtistHome: React.FC = () => {
  const { defaultSectionId } = useOutletContext<ArtistOutletContext>();
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (defaultSectionId) {
    const Section = sectionComponents[defaultSectionId];
    return <Section />;
  }

  const allLinks = artist ? transformFromLinks(artist).linkArray : [];
  if (allLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {renderArtistLinkButtons(allLinks)}
    </div>
  );
};

export default ArtistHome;
