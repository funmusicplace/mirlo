import React from "react";
import Thermometer from "./Thermometer";
import { css } from "@emotion/css";
import useArtistQuery from "utils/useArtistQuery";
import { queryTrackGroup, queryUserSales } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ArtistButton } from "components/Artist/ArtistButtons";
import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";

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

  if (!trackGroup.fundraisingGoal) return null;

  return (
    <div
      className={css`
        padding: 2rem 0;
      `}
    >
      <Thermometer
        current={3000}
        goal={trackGroup.fundraisingGoal / 100}
        artist={artist}
        trackGroup={trackGroup}
      />
    </div>
  );
};

export default Fundraiser;
