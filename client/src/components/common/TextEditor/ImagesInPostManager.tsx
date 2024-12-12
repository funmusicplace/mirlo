import { css } from "@emotion/css";
import { UploadPrompt } from "components/ManageArtist/UploadImage";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheckCircle } from "react-icons/fa";
import api from "services/api";
import { InputEl } from "../Input";
import { useSnackbar } from "state/SnackbarContext";

const ImagesInPostManager: React.FC<{
  images?: PostImage[];
  reload: () => void;
  postId: number;
}> = ({ postId, reload, images }) => {
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });
  const [isSaving, setIsSaving] = React.useState(false);
  const snackbar = useSnackbar();

  const markImageAsFeatured = React.useCallback(
    async (imageId: string) => {
      await api.put(`manage/posts/${postId}/featuredImage`, {
        featuredImageId: imageId,
      });
      reload();
    },
    [reload, postId]
  );

  const callback = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSaving(true);
      try {
        const file = e.target.files?.[0];
        if (file) {
          const jobInfo = await api.uploadFile(
            `manage/posts/${postId}/images`,
            [file]
          );
          const splitUrl = jobInfo.result.jobId.split("/");
          const imgName = splitUrl[splitUrl.length - 1].split(".");
          const imageId = imgName[0];

          markImageAsFeatured(imageId);
        }
      } catch (e) {
        snackbar("Something went wrong", { type: "warning" });
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return (
    <div
      className={css`
        margin-top: 1rem;

        h3 {
          margin-bottom: 0.5rem;
        }
      `}
    >
      <h3>{t("imagesInPost")}</h3>
      <p>{t("imageIsFeatured")}</p>
      <div
        className={css`
          display: flex;
        `}
      >
        {images?.map((image) => (
          <div
            className={css`
              display: inline-block;
              position: relative;
              margin: 0 0.2rem;
              cursor: pointer;
              height: 100%;
            `}
            key={image.id}
            onClick={() => markImageAsFeatured(image.id)}
          >
            <img
              className={css`
                height: 100px;
              `}
              src={image.src}
            />
            {(image.featuredForPost?.length ?? 0) > 0 && (
              <span
                className={css`
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  display: flex;
                  height: 100%;
                  align-items: center;
                  justify-content: center;
                  background-color: rgba(92, 137, 156, 0.7);

                  svg {
                    color: var(--mi-white);
                  }
                `}
              >
                <FaCheckCircle />
              </span>
            )}
          </div>
        ))}
        <div
          className={css`
            display: inline-block;
            height: 100px;
          `}
        >
          <label htmlFor={`featuredImage`}>
            <UploadPrompt
              width="100px"
              height="100px"
              imageTypeDescription={"featured image"}
            />
          </label>
          <InputEl
            type="file"
            id={`featuredImage`}
            accept="image/*"
            onChange={callback}
            style={{ display: "none" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImagesInPostManager;
