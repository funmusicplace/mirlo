import React from "react";
import { useFormContext } from "react-hook-form";
import api from "services/api";

import UploadImageField from "./UploadImageField";

type ExistingImage = {
  id: string;
  sizes: { [key: number]: string };
};

const UploadGeneralImage: React.FC<{
  artistId: number;
  image?: ExistingImage;
  dimensions: "square" | "banner";
  size: 625 | 1024 | 300 | 600 | 1200;
  height: string;
  width: string;
  maxDimensions: string;
  maxSize: string;
  imageTypeDescription: string;
}> = ({
  artistId,
  image,
  dimensions,
  size,
  height,
  width,
  maxDimensions,
  maxSize,
  imageTypeDescription,
}) => {
  const { setValue } = useFormContext();
  const [localImageId, setLocalImageId] = React.useState(image?.id);
  const [existingImage, setExistingImage] = React.useState(image);

  const imageId = image?.id;
  React.useEffect(() => {
    setLocalImageId(imageId);
    setExistingImage(image);
  }, [imageId]);

  const reloadImage = React.useCallback(async () => {
    const result = await api.get<ExistingImage>(`images/${localImageId}`);
    setExistingImage(result.result);
  }, [localImageId]);

  const upload = React.useCallback(
    async (file: File) => {
      const { result } = await api.uploadFile(
        `manage/artists/${artistId}/images`,
        [file],
        { dimensions, ...(localImageId ? { imageId: localImageId } : {}) }
      );
      setLocalImageId(result.imageId);
      setValue("imageId", result.imageId);
      return result;
    },
    [artistId, dimensions, localImageId, setValue]
  );

  const remove = React.useCallback(async () => {
    await api.delete(`manage/artists/${artistId}/images/${localImageId}`);
    setExistingImage(undefined);
    setLocalImageId(undefined);
    setValue("imageId", undefined);
  }, [artistId, localImageId, setValue]);

  return (
    <UploadImageField
      inputId="generalimage"
      imageUrl={existingImage?.sizes?.[size]}
      upload={upload}
      remove={remove}
      onProcessed={reloadImage}
      naturalRatio
      maxWidth={width}
      height={height}
      width={width}
      maxDimensions={maxDimensions}
      maxSize={maxSize}
      imageTypeDescription={imageTypeDescription}
    />
  );
};

export default UploadGeneralImage;
