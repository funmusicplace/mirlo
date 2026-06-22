import { cx } from "@emotion/css";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

import ArtistFallbackComposite from "./ArtistFallbackComposite";

const ArtistSquare: React.FC<{
  artist: Artist;
  circle?: boolean;
}> = ({ artist, circle }) => {
  const standardImageSrc =
    artist.avatar?.sizes?.[300] ?? artist.background?.sizes?.[625];

  return (
    <div
      className={cx(
        "mb-2",
        "max-md:p-0 max-md:mb-4 max-md:mt-0",
        "max-sm:text-(--mi-font-size-small)"
      )}
    >
      <div>
        <Link to={getArtistUrl(artist)} aria-label={artist.name}>
          {standardImageSrc ? (
            <ImageWithPlaceholder
              src={standardImageSrc}
              alt={artist.name}
              size={300}
              square
              objectFit={circle ? "cover" : "contain"}
              className={cx(
                "[&_img]:w-full!",
                circle && "rounded-full overflow-hidden"
              )}
            />
          ) : (
            <div
              className={circle ? "rounded-full overflow-hidden" : undefined}
            >
              <ArtistFallbackComposite artist={artist} />
            </div>
          )}
        </Link>

        <div
          className={cx(
            "flex justify-between flex-nowrap items-start w-full min-h-10 pt-2 mb-2 max-md:mb-0",
            "text-[calc(var(--mi-font-size-small)*var(--page-scale,1))]"
          )}
        >
          <div className={cx("flex flex-col w-full", circle && "text-center")}>
            {artist && (
              <Link
                to={getArtistUrl(artist)}
                className="no-underline! hover:underline! font-normal mb-[0.2rem]"
              >
                {artist.name}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistSquare;
