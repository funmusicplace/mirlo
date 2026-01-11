import React from "react";
import Thermometer from "./Thermometer";
import { css } from "@emotion/css";
import useArtistQuery from "utils/useArtistQuery";
import { queryTrackGroup } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

const Fundraiser: React.FC = () => {
  const { artistId, trackGroupId } = useParams<{
    artistId: string;
    trackGroupId: string;
  }>();
  const { data: artist } = useArtistQuery();
  const { data: trackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId, artistId })
  );

  if (!artist || !trackGroup) return null;

  if (!trackGroup.fundraiser) return null;

  return (
    <Thermometer
      goal={trackGroup.fundraiser.goalAmount / 100}
      artist={artist}
      trackGroup={trackGroup}
    />
  );
};

export default Fundraiser;
