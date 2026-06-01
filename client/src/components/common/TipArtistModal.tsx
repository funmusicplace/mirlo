import React from "react";
import { useTranslation } from "react-i18next";

import Modal from "./Modal";
import TipArtistForm from "./TipArtistForm";

const TipArtistModal: React.FC<{
  artist: Artist;
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}> = ({ artist, open, onClose, children }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  return (
    <Modal
      size="small"
      open={open}
      onClose={onClose}
      title={t("tipArtistByName", { artistName: artist.name }) ?? ""}
    >
      <TipArtistForm artist={artist} />
      {children}
    </Modal>
  );
};

export default TipArtistModal;
