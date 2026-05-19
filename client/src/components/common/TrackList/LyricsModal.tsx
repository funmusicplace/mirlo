import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { MdLyrics } from "react-icons/md";

import { DropdownMenuItemButton } from "../DropdownMenuItem";
import Modal from "../Modal";

const LyricsModal: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <DropdownMenuItemButton
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        startIcon={<MdLyrics />}
      >
        {t("viewLyrics")}
      </DropdownMenuItemButton>
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
