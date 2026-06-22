import { cx } from "@emotion/css";
import React from "react";

import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import ArtistItemLink from "components/Artist/ArtistItemLink";
import ArtistLink from "components/Artist/ArtistLink";
import { Link } from "react-router-dom";
import { getMerchUrl } from "utils/artist";

const ArtistMerchListItem: React.FC<{
  merch: Merch & { artist?: Artist };
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
}> = ({ merch, as }) => {
  const merchImageUrl =
    merch.images?.[0]?.sizes?.[600] + "?" + merch.images?.[0]?.updatedAt;
  const Root = as ?? "div";

  return (
    <Root
      className={cx(
        "mb-2",
        "max-md:p-0 max-md:mb-4 max-md:mt-0",
        "max-sm:text-(--mi-font-size-small)"
      )}
    >
      <div>
        <Link to={getMerchUrl(merch.artist, merch)}>
          <ImageWithPlaceholder
            src={merchImageUrl}
            alt={merch.title}
            size={400}
            square
            objectFit="contain"
            className="[&_img]:w-full!"
          />
        </Link>
        <div
          className={cx(
            "flex justify-between flex-nowrap items-start w-full min-h-10 pt-2 mb-2 max-md:mb-0",
            "text-[calc(var(--mi-font-size-small)*var(--page-scale,1))]"
          )}
        >
          <div className="flex flex-col w-full">
            <ArtistItemLink
              item={merch}
              className="no-underline! hover:underline! font-normal mb-[0.2rem]"
            />
            <ArtistLink
              artist={merch.artist}
              className="no-underline! hover:underline! text-[calc(var(--mi-font-size-xsmall)*var(--page-scale,1))] break-words"
            />
          </div>
        </div>
      </div>
    </Root>
  );
};

export default ArtistMerchListItem;
