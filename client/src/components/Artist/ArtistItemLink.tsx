import { cx } from "@emotion/css";
import {
  isMerch,
  isTrack,
  isTrackgroup,
} from "components/ManageArtist/UploadArtistImage";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  getArtistUrl,
  getMerchUrl,
  getReleaseUrl,
  getTrackUrl,
} from "utils/artist";

type Item =
  | (Merch & { artist?: Artist })
  | (TrackGroup & { artist?: Artist })
  | (Track & { trackGroup: TrackGroup & { artist?: Artist } });

export const determineItemLink = (artist: Artist, item?: Item) => {
  let url = getArtistUrl(artist);

  if (isTrackgroup(item)) {
    url = getReleaseUrl(artist, item);
  } else if (isMerch(item)) {
    url = getMerchUrl(artist, item);
  } else if (isTrack(item)) {
    url = getTrackUrl(artist, item.trackGroup, item);
  }
  return url;
};

const ArtistItemLink: React.FC<{
  item: Item;
  className?: string;
}> = ({ item, className }) => {
  const { t } = useTranslation("translation", { keyPrefix: "playableCover" });

  const artist =
    isTrackgroup(item) || isMerch(item) ? item.artist : item.trackGroup.artist;

  if (!artist) {
    return null;
  }

  const url = determineItemLink(artist, item);

  const labelKey =
    isTrack(item) || (isTrackgroup(item) && item.tracks?.length === 1)
      ? "goToTrack"
      : "goToAlbum";

  return (
    <Link
      to={url}
      aria-label={`${t(labelKey)}: ${item.title || t("untitled")}`}
      className={cx(
        "text-(--mi-text-color)!",
        !item.title?.length && "italic",
        className
      )}
    >
      {item.title?.length ? item.title : t("untitled")}
    </Link>
  );
};
export default ArtistItemLink;
