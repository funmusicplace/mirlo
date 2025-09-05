import React from "react";

import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";

import api from "services/api";
import { css } from "@emotion/css";
import { FaDownload, FaTimes } from "react-icons/fa";
import FormComponent from "components/common/FormComponent";
import Pill from "components/common/Pill";
import { UploadField, UploadLabelWrapper } from "../utils";
import {
  ArtistButton,
  ArtistButtonAnchor,
  ArtistButtonLink,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import LoadingSpinner from "components/common/LoadingSpinner";
import useArtistQuery from "utils/useArtistQuery";

const DownloadableContent: React.FC<{
  merch: Merch;
  reload: () => void;
}> = ({ merch, reload }) => {
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
          merchId: merch.id,
        });

        if (response && response.uploadUrl) {
          const result = await fetch(response.uploadUrl, {
            method: "PUT",
            body: nextFile.file,
            headers: {
              "Content-Type": "application/pdf",
            },
          });

          if (result.ok) {
            snackbar(t("fileUploaded"), { type: "success" });
            reload();
          }
        }
      }
    } catch (e) {
      errorHandler(e);
    }
    if (files.length > 0) {
      await uploadNextFile(files);
    } else {
      setIsSaving(false);
    }
  };

  const deleteContent = async (contentId: number) => {
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
      <label>{t("downloadableContent")}</label>
      {isSaving && (
        <div>
          <LoadingSpinner size="small" fill={colors?.primary} />
        </div>
      )}
      {merch.downloadableContent &&
        merch.downloadableContent.map((c) => (
          <Pill
            key={c.downloadableContentId}
            className={css`
              margin: 0.5rem 0 1rem;
              gap: 0.25rem;
            `}
          >
            {c.downloadableContent.originalFilename}
            <ArtistButtonAnchor
              startIcon={<FaDownload />}
              variant="dashed"
              href={c.downloadableContent.downloadUrl as string}
              rel="noopener noreferrer"
              target="_blank"
            />
            <ArtistButton
              startIcon={<FaTimes />}
              variant="dashed"
              onClick={() => {
                deleteContent(c.downloadableContentId);
              }}
            />
          </Pill>
        ))}

      <UploadLabelWrapper
        htmlFor="downloadableContent"
        className={css`
          height: 100px !important;
          width: 100%;
        `}
      >
        <div>{t("dropFilesHere")}</div>

        <UploadField
          type="file"
          className={css`
            width: 100%;
          `}
          id="downloadableContent"
          multiple
          onChange={(e) => handleFileChange(e.target.files)}
          accept="application/pdf"
        />
      </UploadLabelWrapper>
      <small
        className={css`
          margin-top: 1rem;
        `}
      >
        {t("relatedDownloadableContentInfo")}
      </small>
    </FormComponent>
  );
};

export default DownloadableContent;
