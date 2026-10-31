import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import MerchButtonPopUp from "components/Merch/MerchButtonPopUp";
import { queryArtist } from "queries";
import React from "react";
import { Link } from "react-router-dom";
import { getMerchUrl } from "utils/artist";

const TrackGroupMerchItem: React.FC<{ item: Merch; releaseArtist: Artist }> = ({
  item,
  releaseArtist,
}) => {
  const isReleaseArtistMerch = item.artistId === releaseArtist.id;
  const { data: merchArtist } = useQuery({
    ...queryArtist({ artistSlug: `${item.artistId}` }),
    enabled: !isReleaseArtistMerch,
  });
  const artist = isReleaseArtistMerch ? releaseArtist : merchArtist;

  if (!artist) {
    return (
      <li className="py-2">
        <LoadingBlocks rows={1} height="3rem" margin="0" />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <ImageWithPlaceholder
        src={item.images?.[0]?.sizes?.[60]}
        alt={item.title}
        size={60}
        square
        objectFit="contain"
        className="size-12 shrink-0 rounded-(--mi-border-radius) overflow-hidden"
      />
      <Link
        to={getMerchUrl(artist, item)}
        className="flex-1 min-w-0 text-sm line-clamp-2 text-(--mi-text-color)! no-underline! hover:underline!"
      >
        {item.title}
      </Link>
      <MerchButtonPopUp
        artist={artist}
        merch={item}
        compact
        variant="outlined"
        rounded
      />
    </li>
  );
};

export default TrackGroupMerchItem;
