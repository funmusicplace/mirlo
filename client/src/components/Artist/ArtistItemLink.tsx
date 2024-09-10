import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { css } from "@emotion/css";
import { getMerchUrl, getReleaseUrl } from "utils/artist";
import { isTrackgroup } from "components/ManageArtist/UploadArtistImage";

const ArtistItemLink: React.FC<{
  item: (Merch & { artist?: Artist }) | (TrackGroup & { artist?: Artist });
}> = ({ item }) => {
  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  if (!item.artist) {
    return null;
  }

  return (
    <Link
      to={
        isTrackgroup(item)
          ? getReleaseUrl(item.artist, item)
          : getMerchUrl(item.artist, item)
      }
      aria-label={`${t("goToAlbum")}: ${item.title || t("untitled")}`}
      className={
        item.title.length
          ? css`
              color: var(--mi-normal-foreground-color);
            `
          : css`
              color: var(--mi-light-foreground-color);
              font-style: italic;
            `
      }
    >
      {item.title.length ? item.title : t("untitled")}
    </Link>
  );
};
export default ArtistItemLink;
