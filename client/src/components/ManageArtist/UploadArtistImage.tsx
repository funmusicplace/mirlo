import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
// import { uploadArtistImage } from "services/api/User";

const UploadArtistImage: React.FC<{
  existing: Artist;
  imageType: "avatar" | "banner";
  reload: () => Promise<void>;
  height: string;
  width: string;
  maxDimensions: string;
}> = ({ existing, reload, imageType, height, width, maxDimensions }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const snackbar = useSnackbar();
  const userId = user?.id;
  const replaceImage = React.useCallback(
    async (event: any) => {
      if (userId && existing) {
        try {
          setIsUploadingCover(true);
          await api.uploadFile(
            `users/${userId}/artists/${existing.id}/${imageType}`,
            event.target.files
          );

          snackbar(`Replaced ${imageType}`, { type: "success" });
          setTimeout(async () => {
            await reload();
            setIsUploadingCover(false);
          }, 2000);
        } catch (e) {
          snackbar("Something went wrong with the API", { type: "warning" });
        } finally {
        }
      }
    },
    [userId, existing, snackbar, imageType, reload]
  );

  const imageUrl =
    imageType === "banner"
      ? existing?.banner?.sizes[625]
      : existing?.avatar?.url;

  return (
    <div
      className={css`
        margin-bottom: 1rem;
      `}
    >
      {imageType}
      <div
        className={css`
          position: relative;
          width: ${width};
          min-height: ${height};
        `}
      >
        {isUploadingCover && (
          <div
            className={css`
              height: ${height};
              display: block;
            `}
          >
            Uploading...
          </div>
        )}
        {!isUploadingCover && (
          <>
            {imageUrl && (
              <img src={imageUrl} alt="Banner" style={{ width: "100%" }} />
            )}
            <label
              htmlFor={`upload${imageType}`}
              className={css`
                position: absolute;
                display: flex;
                align-items: center;
                justify-content: center;
                left: 0;
                top: 0;
                height: 100%;
                cursor: pointer;
                width: 100%;
                text-align: center;
                transition: 0.25s;
                &:hover {
                  background-color: rgba(0, 0, 0, 0.4);
                  color: white;
                }
              `}
            >
              Replace
            </label>
            <input
              type="file"
              id={`upload${imageType}`}
              accept="image/png, image/jpeg"
              onChange={replaceImage}
              className={css`
                display: none;
              `}
            />
          </>
        )}
      </div>
      <small>For the best effect, upload a {maxDimensions} size image</small>
    </div>
  );
};

export default UploadArtistImage;
