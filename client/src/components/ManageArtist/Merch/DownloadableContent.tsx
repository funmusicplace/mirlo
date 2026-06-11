import { css } from "@emotion/css";
import {
  ArtistButton,
  ArtistButtonAnchor,
} from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import LoadingSpinner from "components/common/LoadingSpinner";
import Pill from "components/common/Pill";
import UploadFiles from "components/ManageArtist/UploadFiles";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDownload, FaTimes } from "react-icons/fa";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

export const DOWNLOADABLE_CONTENT_MIME_TYPES = [
  "application/pdf",
  "image/*",
  "text/plain",
  "text/markdown",
  "application/epub+zip",
];

// Some browsers don't report a MIME type for .md/.epub files, so we also
// accept these extensions explicitly in the file picker.
export const DOWNLOADABLE_CONTENT_EXTENSIONS = [".txt", ".md", ".epub"];

// Keep in sync with the limit enforced on the server.
export const MAX_DOWNLOADABLE_CONTENT_SIZE_MB = 20;
export const MAX_DOWNLOADABLE_CONTENT_SIZE_BYTES =
  MAX_DOWNLOADABLE_CONTENT_SIZE_MB * 1024 * 1024;

export const uploadDownloadableContentFile = async (
  file: File,
  params: { trackGroupId: number } | { merchId: string }
): Promise<void> => {
  const response = await api.post<
    unknown,
    { result: DownloadableContent; uploadUrl: string }
  >("manage/downloadableContent", {
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    ...params,
  });

  if (response?.uploadUrl) {
    try {
      await fetch(response.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
    } catch (e) {
      await api.delete(`manage/downloadableContent/${response.result.id}`);
      console.error("Error uploading to remote server", e);
      throw e;
    }
  }
};

const DownloadableContent: React.FC<{
  item: Merch | TrackGroup;
  reload: () => void;
  itemType?: "merch" | "release";
}> = ({ item, reload, itemType = "merch" }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (!files) {
      return;
    }
    const allFiles = Array.from(files);
    allFiles
      .filter((file) => file.size > MAX_DOWNLOADABLE_CONTENT_SIZE_BYTES)
      .forEach((file) =>
        snackbar(
          t("fileTooLarge", {
            filename: file.name,
            maxSize: MAX_DOWNLOADABLE_CONTENT_SIZE_MB,
          }),
          { type: "warning" }
        )
      );

    const validFiles = allFiles.filter(
      (file) => file.size <= MAX_DOWNLOADABLE_CONTENT_SIZE_BYTES
    );
    if (validFiles.length === 0) {
      return;
    }

    setIsSaving(true);
    const newContent = validFiles.map((file) => ({
      downloadableContentId: file.name,
      originalFilename: file.name,
      file: file,
    }));
    uploadNextFile(newContent);
  };

  const uploadNextFile = async (files: { file: File }[]) => {
    const nextFile = files.pop();
    try {
      if (nextFile) {
        await uploadDownloadableContentFile(
          nextFile.file,
          itemType === "release"
            ? { trackGroupId: item.id as number }
            : { merchId: item.id as string }
        );
        snackbar(t("fileUploaded"), { type: "success" });
        reload();
      }
    } catch (e) {
      console.error(e);
      errorHandler(e);
    }
    if (files.length > 0) {
      await uploadNextFile(files);
    } else {
      setIsSaving(false);
    }
  };

  const deleteContent = async (contentId: string) => {
    try {
      await api.delete(`manage/downloadableContent/${contentId}`);
      snackbar(t("fileDeleted"), { type: "success" });
      reload();
    } catch (e) {
      errorHandler(e);
    }
  };

  return (
    <FormComponent>
      {isSaving && (
        <div>
          <LoadingSpinner size="small" fill="var(--mi-button-color)" />
        </div>
      )}
      {!!item.downloadableContent && item.downloadableContent.length > 0 && (
        <ul>
          {item.downloadableContent.map((c) => (
            <li key={c.downloadableContentId}>
              <Pill
                variant="tint"
                className={css`
                  margin: 0.5rem 0 1rem;
                  gap: 0.25rem;
                `}
              >
                {c.downloadableContent.originalFilename}
                <ArtistButtonAnchor
                  aria-label={t("downloadDownloadableContentItem", {
                    filename: c.downloadableContent.originalFilename,
                  })}
                  startIcon={<FaDownload />}
                  variant="dashed"
                  href={c.downloadableContent.downloadUrl as string}
                  rel="noopener noreferrer"
                  target="_blank"
                />
                <ArtistButton
                  aria-label={t("removeDownloadableContentItem", {
                    filename: c.downloadableContent.originalFilename,
                  })}
                  startIcon={<FaTimes />}
                  variant="dashed"
                  onClick={() => {
                    deleteContent(c.downloadableContentId);
                  }}
                />
              </Pill>
            </li>
          ))}
        </ul>
      )}
      <UploadFiles
        accept={[
          ...DOWNLOADABLE_CONTENT_MIME_TYPES,
          ...DOWNLOADABLE_CONTENT_EXTENSIONS,
        ].join(",")}
        hint={
          itemType !== "release"
            ? t("relatedDownloadableContentInfo")
            : t("trackGroupRelatedDownloadableContent")
        }
        label={t("downloadableContent")}
        nameForId="other-files"
        onChange={(e) => handleFileChange(e.target.files)}
      />
    </FormComponent>
  );
};

export default DownloadableContent;
