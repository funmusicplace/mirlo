import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { canSupportArtist } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

import FollowArtist from "./FollowArtist";
import SupportArtistButton from "./SupportArtistButton";

const SupportArtistPopUp: React.FC<{
  artist: Pick<
    Artist,
    "id" | "name" | "userId" | "urlSlug" | "subscriptionTiers"
  >;
  prefaceText?: string;
}> = ({ artist, prefaceText }) => {
  const { data: artistData } = useArtistQuery();

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist.userId)
  );

  if (!canSupportArtist(artistData ?? artist, stripeAccountStatus)) {
    return (
      <div
        className={css`
          text-align: center;
          display: flex;
          justify-content: center;
          margin: 1rem;
        `}
      >
        <FollowArtist artistId={artist.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center mx-4 mt-12 mb-4">
      {prefaceText && <p className="mb-3">{prefaceText}</p>}
      <SupportArtistButton artist={artist} size="big" rounded wrap />
    </div>
  );
};

export default SupportArtistPopUp;
