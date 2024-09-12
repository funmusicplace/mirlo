import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { useParams } from "react-router-dom";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { NewMerchButton } from "components/ManageArtist/Merch/NewMerchButton";
import ArtistMerchListItem from "./ArtistMerchListItem";

const ArtistMerch: React.FC = () => {
  const { user } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const merch = React.useMemo(
    () => artist?.merch?.map((merch) => ({ ...merch, artist })),
    [artist]
  );

  if (!artist || (artist.merch?.length === 0 && artist.userId !== user?.id)) {
    return null;
  }

  return (
    <div
      style={{ marginTop: "0rem" }}
      className={css`
        margin-bottom: 2rem;
        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          margin-bottom: 0rem;
        }
      `}
    >
      <SpaceBetweenDiv>
        <div />
        {artist.userId === user?.id && <NewMerchButton artist={artist} />}
      </SpaceBetweenDiv>
      <TrackgroupGrid
        gridNumber={"3"}
        wrap
        as="ul"
        role="list"
        aria-labelledby="artist-navlink-releases"
      >
        {merch?.map((merch) => (
          <ArtistMerchListItem key={merch.id} merch={merch} as="li" />
        ))}
      </TrackgroupGrid>
    </div>
  );
};

export default ArtistMerch;
