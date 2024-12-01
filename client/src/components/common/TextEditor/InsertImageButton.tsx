import React from "react";
import Button from "../Button";
import Modal from "../Modal";
import { FaImage } from "react-icons/fa";
import { InputEl } from "../Input";
import { useCommands } from "@remirror/react";
import { css } from "@emotion/css";
import { useForm } from "react-hook-form";
import api from "services/api";

const InsertImageButton: React.FC<{ postId: number }> = ({ postId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { register, getValues } = useForm<{ images: FileList }>();
  const { insertImage } = useCommands();

  const onAdd = React.useCallback(async () => {
    const images = getValues("images");
    const response = await api.uploadFile(`manage/posts/${postId}/images`, [
      images[0],
    ]);
    insertImage({ src: response.result.jobId });
    setIsOpen(false);
  }, [getValues, postId]);

  return (
    <>
      <Button
        startIcon={<FaImage />}
        type="button"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title="Add a video"
      >
        Choose an image to upload
        <InputEl
          type="file"
          {...register("images")}
          accept="image/jpeg,image/png"
        />
        <Button
          type="button"
          onClick={onAdd}
          className={css`
            margin-top: 1rem;
          `}
        >
          Add Image
        </Button>
      </Modal>
    </>
  );
};

export default InsertImageButton;
