import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";

import api from "services/api";
import useJobStatusCheck from "utils/useJobStatusCheck";
import { useSnackbar } from "state/SnackbarContext";
import { InputEl } from "components/common/Input";

import { Img, Spinner, UploadPrompt } from "./UploadImage";

const getExistingImage = (existing: Artist, imageType: "banner" | "avatar") => {
  const image = existing[imageType];
  if (!image) {
    return undefined;
  }
  const actualImageLocation =
    imageType === "banner" ? image?.sizes?.[625] : image?.sizes?.[300];
  return `${actualImageLocation}/?updatedAt=${image?.updatedAt}`;
};

const UploadArtistImage: React.FC<{
  existing: Artist;
  imageType: "avatar" | "banner";
  height: string;
  width: string;
  maxDimensions: string;
}> = ({ existing, imageType, height, width, maxDimensions }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();

  const [existingImage, setExistingImage] = React.useState(
    getExistingImage(existing, imageType)
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const resetWrapper = React.useCallback(async () => {
    const result = await api.get<Artist>(
      `users/${existing.userId}/artists/${existing.id}/`
    );

    const image = getExistingImage(result.result, imageType);

    setExistingImage(image);
  }, [existing.id, existing.userId, imageType]);

  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: () => {},
    reset: resetWrapper,
  });

  const callback = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSaving(true);
      try {
        const file = e.target.files?.[0];
        if (file) {
          const jobInfo = await api.uploadFile(
            `users/${existing.userId}/artists/${existing.id}/${imageType}`,
            [file]
          );
          setUploadJobs([
            { jobId: jobInfo.result.jobId, jobStatus: "waiting" },
          ]);
        }
      } catch (e) {
        snackbar("Something went wrong", { type: "warning" });
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    },
    [existing.id, existing.userId, imageType, setUploadJobs, snackbar]
  );

  const isLoading =
    uploadJobs?.[0]?.jobStatus !== undefined &&
    uploadJobs?.[0]?.jobStatus !== "completed";

  const rounded = imageType === "avatar" ? true : false;
  return (
    <div
      className={css`
        height: 100%;
        margin-bottom: 1rem;
      `}
    >
      <div
        className={css`
          position: relative;
          margin-bottom: 0.5rem;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: flex-start;
            flex-wrap: wrap;
            flex-direction: column;

            img {
              flex: 45%;
              width: 100%;
            }
            input {
              flex: 45%;
              width: 45%;
            }

            label {
              position: relative;
            }
          `}
        >
          <label htmlFor={`${imageType}image`}>
            {existingImage && (
              <Img src={existingImage} alt={imageType} rounded={rounded} />
            )}

            {!existingImage && (
              <UploadPrompt width={width} height={height} rounded={rounded} />
            )}
            {(isLoading || isSaving) && <Spinner rounded={rounded} />}
          </label>

          <InputEl
            type="file"
            id={`${imageType}image`}
            accept="image/*"
            onChange={callback}
          />
          <small
            className={css`
              width: 100%;
              flex: 100%;
              margin-top: 0.5rem;
            `}
          >
            {t("dimensionsTip", { maxDimensions })}
          </small>
        </div>
      </div>
    </div>
  );
};

export default UploadArtistImage;
