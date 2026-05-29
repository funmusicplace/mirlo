import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import MerchButtonPopUp from "components/Merch/MerchButtonPopUp";
import { queryArtist } from "queries";
import React from "react";
import { Link } from "react-router-dom";
import { getMerchUrl } from "utils/artist";

import { bp } from "../../constants";

const TrackGroupMerchItem: React.FC<{ item: Merch }> = ({ item }) => {
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: `${item.artistId}` })
  );

  if (isLoadingArtist || !artist) {
    return <LoadingBlocks />;
  }

  return (
    <li
      className={css`
        display: flex;
        align-items: center;
        gap: 1rem;

        > a {
          flex: 1;
          min-width: 0;
          font-size: 0.9rem;
        }

        img {
          height: 60px;
        }

        @media (max-width: ${bp.medium}px) {
          flex-wrap: wrap;
          justify-content: center;

          button {
            width: 100%;
          }
          > a {
            flex: initial;
            padding-bottom: 0.5rem;
            font-size: 0.9rem;
          }
        }
      `}
    >
      <ImageWithPlaceholder
        src={item.images?.[0]?.sizes?.[60]}
        alt={item.title}
        size={60}
        square
        objectFit="contain"
      />
      <Link to={getMerchUrl(artist, item)}>{item.title}</Link>
      <MerchButtonPopUp artist={artist} merch={item} compact />
    </li>
  );
};

export default TrackGroupMerchItem;
