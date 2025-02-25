import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";

import api from "services/api";
import useJobStatusCheck from "utils/useJobStatusCheck";
import { useSnackbar } from "state/SnackbarContext";
import { InputEl } from "components/common/Input";
import { AiFillDelete } from "react-icons/ai";

import { Img, ReplaceSpan, Spinner, UploadPrompt } from "./UploadImage";
import Button from "components/common/Button";
import { bp } from "../../constants";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { ArtistButton } from "components/Artist/ArtistButtons";

type ImageType = "banner" | "avatar" | "cover" | "image";

export function isTrackgroup(entity: unknown): entity is TrackGroup {
  if (!entity) {
    return false;
  }
  return (entity as TrackGroup).cover !== undefined;
}

export function isMerch(entity: unknown): entity is Merch {
  if (!entity) {
    return false;
  }
  return (entity as Merch).quantityRemaining !== undefined;
}

const getExistingImage = (
  existing: Artist | TrackGroup | Merch,
  imageType: ImageType
) => {
  let image = undefined;
  if (isTrackgroup(existing)) {
    image = existing["cover"];
  } else if (isMerch(existing)) {
    image = existing.images?.[0];
  } else if (imageType === "avatar" || imageType === "banner") {
    image = existing[imageType];
  }

  if (!image) {
    return undefined;
  }
  const actualImageLocation =
    imageType === "banner" ? image?.sizes?.[625] : image?.sizes?.[600];
  return `${actualImageLocation}/?updatedAt=${image?.updatedAt}`;
};

const buildRootUrl = (existing: TrackGroup | Artist | Merch) => {
  let url = "";
  if (isTrackgroup(existing)) {
    url = `manage/trackGroups/${existing.id}/`;
  } else if (isMerch(existing)) {
    url = `manage/merch/${existing.id}/`;
  } else {
    url = `manage/artists/${existing.id}/`;
  }
  return url;
};

const UploadArtistImage: React.FC<{
  existing: Artist | TrackGroup | Merch;
  imageType: ImageType;
  height: string;
  width: string;
  maxDimensions: string;
  maxSize: string;
  imageTypeDescription: string;
}> = ({
  existing,
  imageType,
  height,
  width,
  maxDimensions,
  maxSize,
  imageTypeDescription,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { artistId: artistParamId } = useParams();

  const { refetch: refresh } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );
  const [existingImage, setExistingImage] = React.useState(
    getExistingImage(existing, imageType)
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const resetWrapper = React.useCallback(async () => {
    let result = await api.get<TrackGroup | Artist>(buildRootUrl(existing));

    const image = getExistingImage(result.result, imageType);

    setExistingImage(image);
    refresh();
  }, [existing, imageType, refresh]);

  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: () => {},
    reset: resetWrapper,
    queue: "optimizeImage",
  });

  const deleteImage = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await api.delete(`${buildRootUrl(existing)}${imageType}`);
    } catch (e) {
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsSaving(false);
      resetWrapper();
    }
  }, [existing, imageType, resetWrapper, snackbar]);

  const callback = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSaving(true);
      try {
        const file = e.target.files?.[0];
        if (file) {
          const jobInfo = await api.uploadFile(
            `${buildRootUrl(existing)}${imageType}`,
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
    [existing, imageType, setUploadJobs, snackbar]
  );

  const isLoading =
    uploadJobs?.[0]?.jobStatus !== undefined &&
    uploadJobs?.[0]?.jobStatus !== "completed";

  const rounded = imageType === "avatar" ? true : false;

  return (
    <div
      className={css`
        height: 100%;
        width: 100%;
      `}
    >
      <div
        className={css`
          position: relative;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: flex-start;
            flex-wrap: wrap;
            flex-direction: column;
            max-width: 400px;

            img {
              flex: 45%;
              width: 100%;
            }
            input {
              flex: 100%;
              width: 100%;
            }

            label {
              position: relative;
              width: 100%;
              margin-bottom: 1rem;
            }
          `}
        >
          <label htmlFor={`${imageType}image`}>
            {existingImage && (
              <div
                className={css`
                  span {
                    opacity: 0;
                    color: rgba(0, 0, 0, 0);
                  }
                  &:hover {
                    span {
                      opacity: 1;
                      color: white;
                    }
                  }
                `}
              >
                <ReplaceSpan
                  rounded={rounded}
                  className={css`
                    @media (max-width: ${bp.medium}px) {
                      font-size: var(--mi-font-size-xsmall) !important;
                      height: 96% !important;
                    }
                  `}
                >
                  {t("replaceImage")}
                </ReplaceSpan>
                <Img src={existingImage} alt={imageType} rounded={rounded} />
              </div>
            )}
            {existingImage && (
              <small
                className={css`
                  flex: 100%;
                  height: 2.5rem;
                  width: 2.5rem;
                  bottom: 1rem;
                  right: 1rem;
                  border-radius: 100%;
                  background: rgba(0, 0, 0, 0.5);
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  position: absolute;
                  z-index: 999;
                  text-align: right;
                  span {
                    svg {
                      margin-right: 0.3rem !important;
                      height: 1.5rem;
                      width: 1.5rem;
                    }
                  }
                  @media (max-width: ${bp.medium}px) {
                    bottom: 0.3rem;
                    right: 0.3rem;
                    span {
                      svg {
                        margin-right: 0.3rem !important;
                        height: 1rem;
                        width: 1rem;
                      }
                    }
                  }
                `}
              >
                <div>
                  <ArtistButton
                    onClick={deleteImage}
                    variant="link"
                    size="compact"
                    onlyIcon
                    type="button"
                    startIcon={<AiFillDelete />}
                    className={css`
                      color: white !important;
                    `}
                  />
                </div>
              </small>
            )}
            {!existingImage && (
              <UploadPrompt
                width={width}
                height={height}
                rounded={rounded}
                imageTypeDescription={imageTypeDescription}
              />
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
              @media (max-width: ${bp.medium}px) {
                font-size: var(--mi-font-size-xsmall);
              }
            `}
          >
            {t("dimensionsTip", { maxDimensions, maxSize })}
          </small>
        </div>
      </div>
    </div>
  );
};

export default UploadArtistImage;
