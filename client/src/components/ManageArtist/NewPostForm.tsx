import React from "react";

import Modal from "../common/Modal";
import PostForm from "./PostForm";
import { useTranslation } from "react-i18next";

const NewPostForm: React.FC<{
  open: boolean;
  onClose: () => void;
  reload: () => Promise<void>;
  artist: Artist;
}> = ({ reload, artist, open, onClose }) => {
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("newBlogPostFor", { artistName: artist.name }) ?? ""}
    >
      <PostForm {...{ reload, artist }} onClose={onClose} />
    </Modal>
  );
};

export default NewPostForm;
