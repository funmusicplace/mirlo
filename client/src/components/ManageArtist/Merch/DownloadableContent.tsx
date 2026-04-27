import { css } from "@emotion/css";
import {
  ArtistButton,
  ArtistButtonAnchor,
  useGetArtistColors,
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

const DownloadableContent: React.FC<{
  item: Merch | TrackGroup;
  reload: () => void;
  itemType?: "merch" | "release";
}> = ({ item, reload, itemType = "merch" }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { colors } = useGetArtistColors();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleFileChange = (files: FileList | null) => {
    setIsSaving(true);
    if (files) {
      const newContent = Array.from(files).map((file) => ({
        downloadableContentId: file.name,
        originalFilename: file.name,
        file: file,
      }));
      uploadNextFile(newContent);
      // setDownloadableContent(newContent);
    }
  };

  const uploadNextFile = async (files: { file: File }[]) => {
    const nextFile = files.pop();
    try {
      if (nextFile) {
        const response = await api.post<
          unknown,
          {
            result: DownloadableContent;
            uploadUrl: string;
          }
        >("manage/downloadableContent", {
          filename: nextFile.file.name,
          mimeType: nextFile.file.type,
          ...(itemType === "release"
            ? { trackGroupId: item.id }
            : { merchId: item.id }),
        });

        if (response && response.uploadUrl) {
          try {
            const result = await fetch(response.uploadUrl, {
              method: "PUT",
              body: nextFile.file,
              headers: {
                "Content-Type": nextFile.file.type,
              },
            });
            if (result.ok) {
              snackbar(t("fileUploaded"), { type: "success" });
              reload();
            }
          } catch (e) {
            await api.delete(
              `manage/downloadableContent/${response.result.id}`
            );
            console.error("Error uploading to remote server", e);
          }
        }
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
          <LoadingSpinner size="small" fill={colors?.button} />
        </div>
      )}
      {!!item.downloadableContent && item.downloadableContent.length > 0 && (
        <ul>
          {item.downloadableContent.map((c) => (
            <li key={c.downloadableContentId}>
              <Pill
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
        accept="application/pdf,image/*"
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
