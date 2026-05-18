import { css } from "@emotion/css";
import styled from "@emotion/styled";
import Spinner from "components/common/Spinner";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaUpload } from "react-icons/fa";

import { extractZipFiles, prescanAudioFiles } from "../utils";

import { ZipImportPreview } from "./ZipImportPreview";

const DropZoneContainer = styled.div<{ isDragging: boolean }>`
  position: relative;
  border: 2px dashed var(--mi-text-color);
  border-radius: var(--mi-border-radius);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: ${(props) =>
    props.isDragging ? "var(--mi-tint-color)" : "transparent"};
  border-color: ${(props) =>
    props.isDragging ? "var(--mi-button-color)" : "var(--mi-text-color)"};
`;

const HiddenInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

const IconWrapper = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--mi-text-color);
`;

const TextWrapper = styled.div`
  margin-bottom: 0.5rem;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
  color: var(--mi-text-color);
`;

const Subtitle = styled.div`
  font-size: 0.9rem;
  color: var(--mi-lighter-foreground-color);
`;

interface ZipDropZoneProps {
  existingTracksCount: number;
  trackGroupId: number;
  artistId: number;
  reload: () => void;
}

export const ZipDropZone: React.FC<ZipDropZoneProps> = ({
  existingTracksCount,
  trackGroupId,
  artistId,
  reload,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "zipImport" });

  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preScanResult, setPreScanResult] = useState<PreScanResult | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);
  const [invalidFilesAction, setInvalidFilesAction] = useState<
    "skip" | "cancel" | null
  >(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processZip = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError(t("notAZipFile"));
      return;
    }

    setError(null);
    setIsScanning(true);
    try {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 1000) {
        setError(t("fileTooLarge", { size: "1000MB" }));
        return;
      }

      const extracted = await extractZipFiles(file);
      if (extracted.errorMessage) {
        setError(extracted.errorMessage);
        return;
      }

      const result = await prescanAudioFiles(extracted.files);
      setPreScanResult(result);
      setSelectedCoverIndex(0);
      setInvalidFilesAction(null);
      setShowPreview(true);
    } catch (e) {
      setError(
        `${t("error")}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      await processZip(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await processZip(e.target.files[0]);
      }
    },
    []
  );

  const handleClose = useCallback(() => {
    setShowPreview(false);
    setPreScanResult(null);
    setSelectedCoverIndex(0);
    setInvalidFilesAction(null);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h2>{t("importFromZip")}</h2>
      <p>{t("importAlbumContent")}</p>
      <DropZoneContainer
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={css`
          ${isScanning ? "opacity: 0.6; pointer-events: none;" : ""}
        `}
      >
        <HiddenInput
          type="file"
          accept=".zip"
          onChange={handleFileInput}
          disabled={isScanning}
          aria-label="Import album from zip file"
        />
        <IconWrapper>{isScanning ? <Spinner /> : <FaUpload />}</IconWrapper>
        <TextWrapper>
          <Title>{t("title")}</Title>
          <Subtitle>{t("subtitle")}</Subtitle>
        </TextWrapper>
        {isScanning && <Subtitle>{t("scanning")}</Subtitle>}
      </DropZoneContainer>
      {error && (
        <div
          className={css`
            margin-top: 1rem;
            padding: 0.75rem 1rem;
            background-color: rgba(244, 67, 54, 0.1);
            border-left: 4px solid #f44336;
            border-radius: var(--mi-border-radius);
            color: var(--mi-text-color);
            font-size: 0.9rem;
          `}
        >
          {error}
        </div>
      )}
      <ZipImportPreview
        trackGroupId={trackGroupId}
        artistId={artistId}
        reload={reload}
        isOpen={showPreview && preScanResult !== null}
        preScanResult={preScanResult}
        existingTracksCount={existingTracksCount}
        selectedCoverIndex={selectedCoverIndex}
        onSelectedCoverChange={setSelectedCoverIndex}
        invalidFilesAction={invalidFilesAction}
        onInvalidFilesActionChange={setInvalidFilesAction}
        onClose={handleClose}
      />
      <p className="text-sm opacity-75">{t("zipUploadDescription")}</p>
    </div>
  );
};
