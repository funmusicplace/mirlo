import { css } from "@emotion/css";
import { useCommands } from "@remirror/react";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaImage } from "react-icons/fa";

import Button from "../Button";
import { InputEl } from "../Input";
import Modal from "../Modal";

import { postImageAttrs, uploadPostImage } from "./uploadPostImage";

const InsertImageButton: React.FC<{ postId?: number }> = ({ postId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { register, getValues, watch } = useForm<{ images: FileList }>();
  const hasImage = (watch("images")?.length ?? 0) > 0;
  const { insertImage } = useCommands();
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });

  const onAdd = React.useCallback(async () => {
    const images = getValues("images");
    if (postId && images?.[0]) {
      const image = await uploadPostImage(postId, images[0]);
      insertImage(postImageAttrs(image));
    }
    setIsOpen(false);
  }, [getValues, postId]);

  return (
    <>
      <Button
        aria-label={t("addImage")}
        startIcon={<FaImage />}
        type="button"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title=""
      >
        {t("uploadImageDescription")}
        <InputEl
          type="file"
          {...register("images")}
          accept="image/jpeg,image/png"
        />
        <Button
          type="button"
          onClick={onAdd}
          disabled={!hasImage}
          className={css`
            margin-top: 1rem;
          `}
        >
          {t("addImage")}
        </Button>
      </Modal>
    </>
  );
};

export default InsertImageButton;
