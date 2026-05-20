import { useQuery } from "@tanstack/react-query";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import ArtistSquare from "components/Artist/ArtistSquare";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import SectionActionStrip from "components/common/SectionActionStrip";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import { useParams } from "react-router-dom";

import { ManageSectionWrapper } from "./ManageSectionWrapper";

const ManageArtistRoster: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { artistId } = useParams();

  if (!artistId) {
    return <div>{t("doesNotExist")}</div>;
  }

  const { data: artist, isPending } = useQuery(
    queryArtist({ artistSlug: artistId })
  );

  if (isPending) {
    return <LoadingBlocks />;
  }

  const rosterArtists = artist?.user?.artistLabels ?? [];

  return (
    <ManageSectionWrapper>
      <SectionActionStrip>
        <ArtistButtonLink
          to="/account/label"
          size="compact"
          variant="dashed"
          startIcon={<FaPen />}
        >
          {t("manageLabelArtists")}
        </ArtistButtonLink>
      </SectionActionStrip>
      {rosterArtists.length === 0 ? (
        <div>{t("noArtistsOnRosterYet")}</div>
      ) : (
        <TrackgroupGrid gridNumber="4" as="ul" role="list">
          {rosterArtists.map((al) => (
            <ArtistSquare key={al.artist.id} artist={al.artist} />
          ))}
        </TrackgroupGrid>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageArtistRoster;
