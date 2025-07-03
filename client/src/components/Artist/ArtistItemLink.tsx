import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { css } from "@emotion/css";
import {
  getArtistUrl,
  getMerchUrl,
  getReleaseUrl,
  getTrackUrl,
} from "utils/artist";
import {
  isMerch,
  isTrack,
  isTrackgroup,
} from "components/ManageArtist/UploadArtistImage";

type Item =
  | (Merch & { artist?: Artist })
  | (TrackGroup & { artist?: Artist })
  | (Track & { trackGroup: TrackGroup & { artist?: Artist } });

export const determineItemLink = (artist: Artist, item: Item) => {
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
}> = ({ item }) => {
  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  const artist =
    isTrackgroup(item) || isMerch(item) ? item.artist : item.trackGroup.artist;

  if (!artist) {
    return null;
  }

  const url = determineItemLink(artist, item);

  return (
    <Link
      to={url}
      aria-label={`${t("goToAlbum")}: ${item.title || t("untitled")}`}
      className={
        item.title?.length
          ? css`
              color: var(--mi-normal-foreground-color);
            `
          : css`
              color: var(--mi-light-foreground-color);
              font-style: italic;
            `
      }
    >
      {item.title?.length ? item.title : t("untitled")}
    </Link>
  );
};
export default ArtistItemLink;
