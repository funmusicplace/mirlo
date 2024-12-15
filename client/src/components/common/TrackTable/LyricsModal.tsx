import { css } from "@emotion/css";
import Button from "../Button";
import { useTranslation } from "react-i18next";
import { ImEmbed } from "react-icons/im";
import Modal from "../Modal";
import React from "react";
import { MdLyrics } from "react-icons/md";

const LyricsModal: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button
        compact
        transparent
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        startIcon={<MdLyrics />}
        className={css`
          .startIcon {
            padding-left: 1rem;
          }
          :hover {
            background: transparent !important;
            opacity: 0.6;
          }
        `}
      >
        {t("viewLyrics")}
      </Button>
      <Modal onClose={() => setIsOpen(false)} open={isOpen} title={t("lyrics")}>
        <div
          className={css`
            white-space: pre-line;
          `}
        >
          {track.lyrics}
        </div>
      </Modal>
    </>
  );
};

export default LyricsModal;
