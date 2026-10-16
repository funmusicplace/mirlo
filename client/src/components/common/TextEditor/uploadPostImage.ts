import api from "services/api";

export type UploadedPostImage = { src: string; imageId: string };

export const uploadPostImage = async (postId: number, file: File) => {
  const { result } = await api.uploadFile<UploadedPostImage>(
    `manage/posts/${postId}/images`,
    [file]
  );
  return result;
};

export const postImageAttrs = (image: UploadedPostImage) => ({
  src: image.src,
  "data-image-id": image.imageId,
});
