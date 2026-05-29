import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import ShareToSocials from "components/common/ShareToSocials";
import React from "react";
import { useTranslation } from "react-i18next";
import { BsShare } from "react-icons/bs";

const ShareButton: React.FC<{
  title: string;
  url: string;
  modalTitle: string;
  buttonClassName?: string;
  size?: "compact" | "big" | "tiny";
}> = ({ title, url, modalTitle, buttonClassName, size }) => {
  const { t } = useTranslation("translation", { keyPrefix: "share" });
  const [isOpen, setIsOpen] = React.useState(false);

  const handleShareClick = async () => {
    const shareData = { title, url };
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
        title={modalTitle}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <ShareToSocials
          url={url}
          title={title}
          socials={["mastodon", "bluesky", "email"]}
        />
      </Modal>
    </>
  );
};

export default ShareButton;
