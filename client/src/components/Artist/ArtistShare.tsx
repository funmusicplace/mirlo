import ShareButton from "components/common/ShareButton";
import { useTranslation } from "react-i18next";
import { getArtistUrl } from "utils/artist";

const ArtistShare: React.FC<{
  artist: Artist;
  buttonClassName?: string;
  size?: "compact" | "big" | "tiny";
}> = ({ artist, buttonClassName, size }) => {
  const { t } = useTranslation("translation", { keyPrefix: "share" });

  if (!artist) return null;

  const artistUrl = `${import.meta.env.VITE_CLIENT_DOMAIN}${getArtistUrl(artist)}`;

  return (
    <ShareButton
      title={artist.name}
      url={artistUrl}
      modalTitle={t("shareArtist", { artistName: artist.name }) ?? ""}
      buttonClassName={buttonClassName}
      size={size}
    />
  );
};

export default ArtistShare;
