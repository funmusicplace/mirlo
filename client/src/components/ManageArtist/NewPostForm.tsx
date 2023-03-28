import React from "react";

import Modal from "../common/Modal";
import PostForm from "./PostForm";

const NewPostForm: React.FC<{
  open: boolean;
  onClose: () => void;
  reload: () => Promise<void>;
  artist: Artist;
}> = ({ reload, artist, open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <PostForm {...{ reload, artist }} onClose={onClose} />
    </Modal>
  );
};

export default NewPostForm;
