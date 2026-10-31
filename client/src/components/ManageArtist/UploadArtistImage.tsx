import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";

import UploadImageField from "./UploadImageField";

type ImageType = "background" | "avatar" | "cover" | "image";

export function isTrackgroup(entity: unknown): entity is TrackGroup {
  if (!entity) {
    return false;
  }
  return (entity as TrackGroup).cover !== undefined;
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
  existing: Artist | TrackGroup,
  imageType: ImageType
) => {
  let image:
    | { sizes?: { [key: number]: string }; updatedAt?: string }
    | undefined = undefined;
  if (isTrackgroup(existing)) {
    image = existing["cover"];
  } else if (imageType === "avatar") {
    image = (existing as Artist).avatar;
  } else if (imageType === "background") {
    image = (existing as Artist).background;
  }

  if (!image) {
    return undefined;
  }
  const actualImageLocation =
    imageType === "background" ? image?.sizes?.[625] : image?.sizes?.[600];
  return `${actualImageLocation}?updatedAt=${image?.updatedAt}`;
};

const buildRootUrl = (existing: TrackGroup | Artist) => {
  let url = "";
  if (isTrackgroup(existing)) {
    url = `manage/trackGroups/${existing.id}/`;
  } else {
    url = `manage/artists/${existing.id}/`;
  }
  return url;
};

const UploadArtistImage: React.FC<{
  existing: Artist | TrackGroup;
  imageType: ImageType;
  height: string;
  width: string;
  maxDimensions: string;
  maxSize: string;
  imageTypeDescription: string;
  isLoading?: boolean;
}> = ({
  existing,
  imageType,
  height,
  width,
  maxDimensions,
  maxSize,
  imageTypeDescription,
  isLoading,
}) => {
  const { artistId: artistParamId } = useParams();

  const { refetch: refresh } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );
  const [existingImage, setExistingImage] = React.useState<
    string | undefined
  >();
  React.useEffect(() => {
    setExistingImage(getExistingImage(existing, imageType));
  }, [existing, imageType]);

  const reloadImage = React.useCallback(async () => {
    let result = await api.get<TrackGroup | Artist>(buildRootUrl(existing));
    setExistingImage(getExistingImage(result.result, imageType));
    refresh();
  }, [existing, imageType, refresh]);

  const upload = React.useCallback(
    async (file: File) => {
      const { result } = await api.uploadFile(
        `${buildRootUrl(existing)}${imageType}`,
        [file]
      );
      return result;
    },
    [existing, imageType]
  );

  const remove = React.useCallback(async () => {
    await api.delete(`${buildRootUrl(existing)}${imageType}`);
    await reloadImage();
  }, [existing, imageType, reloadImage]);

  return (
    <UploadImageField
      inputId={`${imageType}image`}
      imageUrl={existingImage}
      upload={upload}
      remove={remove}
      onProcessed={reloadImage}
      alt={imageType}
      rounded={imageType === "avatar"}
      height={height}
      width={width}
      maxDimensions={maxDimensions}
      maxSize={maxSize}
      imageTypeDescription={imageTypeDescription}
      isLoading={isLoading}
    />
  );
};

export default UploadArtistImage;
