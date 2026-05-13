import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import ShareToSocials from "components/common/ShareToSocials";
import React from "react";
import { useTranslation } from "react-i18next";
import { BsShare } from "react-icons/bs";
import { getArtistUrl } from "utils/artist";

const SHOW_EMBED_SECTION = false;

const ArtistShare: React.FC<{
  artist: Artist;
  buttonClassName?: string;
}> = ({ artist, buttonClassName }) => {
  const { t } = useTranslation("translation", { keyPrefix: "share" });
  const [isOpen, setIsOpen] = React.useState(false);

  if (!artist) return null;

  const artistUrl = `${import.meta.env.VITE_CLIENT_DOMAIN}${getArtistUrl(artist)}`;

  return (
    <>
      <ArtistButton
        onlyIcon
        aria-label={t("share") ?? ""}
        title={t("share") ?? ""}
        onClick={() => setIsOpen(true)}
        startIcon={<BsShare />}
        className={buttonClassName}
      />
      <Modal
        size="small"
        title={t("shareArtist", { artistName: artist.name }) ?? ""}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <ShareToSocials url={artistUrl} title={artist.name} />
        {SHOW_EMBED_SECTION && (
          <div>{/* embed iframe section, hidden for now */}</div>
        )}
      </Modal>
    </>
  );
};

export default ArtistShare;
