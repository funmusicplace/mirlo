import React from "react";

import Modal from "../common/Modal";
import AlbumForm from "./AlbumForm";

const NewAlbumForm: React.FC<{
  open: boolean;
  onClose: () => void;
  reload: () => Promise<void>;
  artist: Artist;
}> = ({ reload, artist, open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <AlbumForm {...{ reload, artist }} onClose={onClose} />
    </Modal>
  );
};

export default NewAlbumForm;
