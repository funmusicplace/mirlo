import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";

import api from "services/api";
import useJobStatusCheck from "utils/useJobStatusCheck";
import { useSnackbar } from "state/SnackbarContext";
import { InputEl } from "components/common/Input";
import { AiFillDelete } from "react-icons/ai";

import { Img, ReplaceSpan, Spinner, UploadPrompt } from "./UploadImage";
import { bp } from "../../constants";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { useAuthContext } from "state/AuthContext";
import { useFormContext } from "react-hook-form";

type ImageType = "banner" | "avatar" | "cover" | "image" | "profile";

export function isTrackgroup(entity: unknown): entity is TrackGroup {
  if (!entity) {
    return false;
  }
  return (entity as TrackGroup).cover !== undefined;
}

export function isUser(entity: unknown): entity is LoggedInUser {
  if (!entity) {
    return false;
  }
  return (entity as LoggedInUser).userAvatar !== undefined;
}

export function isTrack(entity: unknown): entity is Track {
  if (!entity) {
    return false;
  }
  return (entity as Track).trackGroupId !== undefined;
}

export function isMerch(entity: unknown): entity is Merch {
  if (!entity) {
    return false;
  }
  return (entity as Merch).quantityRemaining !== undefined;
}

const getExistingImage = (
  existing: Artist | TrackGroup | Merch | LoggedInUser,
  imageType: ImageType
) => {
  let image = undefined;
  if (isTrackgroup(existing)) {
    image = existing["cover"];
  } else if (isMerch(existing)) {
    image = existing.images?.[0];
  } else if (isUser(existing)) {
    if (isUser(existing) && imageType === "avatar") {
      image = existing.userAvatar;
    } else if (isUser(existing) && imageType === "banner") {
      image = existing.userBanner;
    }
  } else if (imageType === "avatar" || imageType === "banner") {
    image = existing[imageType];
  }

  if (!image) {
    return undefined;
  }
  const actualImageLocation =
    imageType === "banner" ? image?.sizes?.[625] : image?.sizes?.[600];
  return `${actualImageLocation}?updatedAt=${image?.updatedAt}`;
};

type ExistingImage = {
  sizes: { [key: number]: string };
};

const UploadGeneralImage: React.FC<{
  artistId: number;
  imageId?: string;
  image?: { id: string; sizes: { [key: number]: string } };
  dimensions?: "square" | "banner";
  rounded?: boolean;
  labelFor?: string;
  imageAlt?: string;
  size?: 625 | 1024 | 300 | 600 | 1200;
  // imageType: ImageType;
  height: string;
  width: string;
  maxDimensions: string;
  maxSize: string;
  imageTypeDescription: string;
  afterSave?: () => void;
}> = ({
  artistId,
  image,
  dimensions,
  rounded,
  labelFor,
  imageAlt,
  height,
  size,
  width,
  maxDimensions,
  maxSize,
  imageTypeDescription,
  afterSave,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { setValue } = useFormContext();
  const { artistId: artistParamId } = useParams();
  const [localImageId, setLocalImageId] = React.useState<string | undefined>(
    image?.id
  );
  const [existingImage, setExistingImage] = React.useState<
    ExistingImage | undefined
  >(image);

  const [isSaving, setIsSaving] = React.useState(false);

  const resetWrapper = React.useCallback(async () => {
    let result = await api.get<ExistingImage>(`images/${localImageId}`);

    setExistingImage(result.result);
    console.log("calling after save");
    afterSave?.();
  }, [localImageId, afterSave, setValue]);

  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: () => {},
    reset: resetWrapper,
    queue: "optimizeImage",
  });

  const deleteImage = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await api.delete(`manage/artists/${artistId}/images/${localImageId}`);
    } catch (e) {
      snackbar("Something went wrong", { type: "warning" });
      console.error(e);
    } finally {
      setIsSaving(false);
      resetWrapper();
    }
  }, [resetWrapper, snackbar]);

  const callback = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSaving(true);
      try {
        const file = e.target.files?.[0];
        if (file) {
          const jobInfo = await api.uploadFile(
            `manage/artists/${artistId}/images`,
            [file],
            {
              ...(dimensions ? { dimensions } : {}),
              ...(localImageId ? { imageId: localImageId } : {}),
            }
          );
          setUploadJobs([
            { jobId: jobInfo.result.jobId, jobStatus: "waiting" },
          ]);
          setLocalImageId(jobInfo.result.imageId);
          console.log("setting value in parent", jobInfo.result.imageId);
          setValue("imageId", jobInfo.result.imageId);
        }
      } catch (e) {
        snackbar("Something went wrong", { type: "warning" });
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    },
    [setUploadJobs, snackbar, dimensions, localImageId]
  );

  const isLoading =
    uploadJobs?.[0]?.jobStatus !== undefined &&
    uploadJobs?.[0]?.jobStatus !== "completed";

  return (
    <div
      className={css`
        display: flex;
        align-items: flex-start;
        flex-wrap: wrap;
        flex-direction: column;
        max-width: ${width};
        height: 100%;
        width: 100%;

        img {
          width: 100%;
        }
        input {
          flex: 100%;
          width: 100%;
        }

        label {
          position: relative;
          margin-bottom: 1rem;
        }
      `}
    >
      <label
        htmlFor={`${labelFor}image`}
        className={css`
          width: 100%;
        `}
      >
        {size && existingImage?.sizes?.[size] && (
          <div
            className={css`
              height: ${height};
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
            <ReplaceSpan rounded={rounded} className={css``}>
              {t("replaceImage")}
            </ReplaceSpan>
            <Img
              src={existingImage.sizes[size] + `?updatedAt=${Date.now()}`}
              alt={imageAlt}
              rounded={rounded}
              className={css`
                width: ${width};
                height: ${height};
              `}
            />
          </div>
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

      <div
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <InputEl
          type="file"
          id={`${labelFor}image`}
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
      {existingImage && (
        <ArtistButton
          onClick={deleteImage}
          variant="dashed"
          onlyIcon
          type="button"
          startIcon={<AiFillDelete />}
        />
      )}
    </div>
  );
};

export default UploadGeneralImage;
