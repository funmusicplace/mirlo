import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import ShareToSocials from "components/common/ShareToSocials";
import React from "react";
import { useTranslation } from "react-i18next";
import { BsShare } from "react-icons/bs";
import { getArtistUrl } from "utils/artist";

const ArtistShare: React.FC<{
  artist: Artist;
  buttonClassName?: string;
  size?: "compact" | "big" | "tiny";
}> = ({ artist, buttonClassName, size }) => {
  const { t } = useTranslation("translation", { keyPrefix: "share" });
  const [isOpen, setIsOpen] = React.useState(false);

  if (!artist) return null;

  const artistUrl = `${import.meta.env.VITE_CLIENT_DOMAIN}${getArtistUrl(artist)}`;

  const handleShareClick = async () => {
    const shareData = { title: artist.name, url: artistUrl };
    const isTouchPrimary =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    const canNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" ||
        navigator.canShare(shareData));

    if (isTouchPrimary && canNativeShare) {
      try {
        await navigator.share(shareData);
      } catch {}
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <ArtistButton
        onlyIcon
        aria-label={t("share") ?? ""}
        title={t("share") ?? ""}
        onClick={handleShareClick}
        startIcon={<BsShare />}
        size={size}
        className={buttonClassName}
      />
      <Modal
        size="small"
        title={t("shareArtist", { artistName: artist.name }) ?? ""}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <ShareToSocials
          url={artistUrl}
          title={artist.name}
          socials={["mastodon", "bluesky", "email"]}
        />
      </Modal>
    </>
  );
};

export default ArtistShare;
