import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--mi-text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MetaGrid = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
  font-size: 0.9rem;

  dt {
    color: var(--mi-lighter-foreground-color);
    font-weight: 600;
    white-space: nowrap;
  }

  dd {
    margin: 0;
    color: var(--mi-text-color);
  }
`;

const AudioFilesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AudioFileItem = styled.div`
  padding: 0.75rem;
  background-color: var(--mi-tint-color);
  border-radius: var(--mi-border-radius);
  font-size: 0.9rem;
`;

const TrackNumber = styled.span`
  font-weight: 600;
  color: var(--mi-button-color);
  margin-right: 0.5rem;
`;

const FileName = styled.span`
  color: var(--mi-text-color);
`;

const ArtistName = styled.span`
  font-size: 0.85rem;
  color: var(--mi-lighter-foreground-color);
  display: block;
  margin-top: 0.25rem;
`;

const ImageGallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ImageOption = styled.label<{ selected?: boolean }>`
  position: relative;
  cursor: pointer;
  border-radius: var(--mi-border-radius);
  overflow: hidden;
  border: 3px solid
    ${(props) => (props.selected ? "var(--mi-button-color)" : "transparent")};
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--mi-button-color);
  }

  input[type="radio"] {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
  }

  img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
  }
`;

const AlertBox = styled.div<{ type: "warning" | "error" }>`
  padding: 1rem;
  border-radius: var(--mi-border-radius);
  margin-bottom: 1rem;
  display: flex;
  gap: 0.75rem;
  background-color: ${(props) =>
    props.type === "warning"
      ? "rgba(255, 193, 7, 0.1)"
      : "rgba(244, 67, 54, 0.1)"};
  border-left: 4px solid
    ${(props) => (props.type === "warning" ? "#FFC107" : "#F44336")};
`;

const AlertIcon = styled.div`
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
`;

const AlertText = styled.div`
  font-size: 0.9rem;
  line-height: 1.4;
`;

const InvalidFilesList = styled.ul`
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  font-size: 0.85rem;

  li {
    color: var(--mi-lighter-foreground-color);
    margin-bottom: 0.25rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const SuccessIcon = styled.span`
  color: var(--mi-success-background-color);
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

interface ZipImportPreviewProps {
  isOpen: boolean;
  preScanResult: PreScanResult | null;
  existingTracksCount: number;
  selectedCoverIndex: number;
  onSelectedCoverChange: (index: number) => void;
  invalidFilesAction: "skip" | "cancel" | null;
  onInvalidFilesActionChange: (action: "skip" | "cancel") => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const ZipImportPreview: React.FC<ZipImportPreviewProps> = ({
  isOpen,
  preScanResult,
  existingTracksCount,
  selectedCoverIndex,
  onSelectedCoverChange,
  invalidFilesAction,
  onInvalidFilesActionChange,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "zipImport" });

  const hasInvalidFiles = (preScanResult?.invalidFiles.length ?? 0) > 0;

  const canConfirm =
    (preScanResult?.audioFiles.length ?? 0) > 0 &&
    (!hasInvalidFiles || invalidFilesAction === "skip");

  const sortedAudioFiles = useMemo(
    () =>
      [...(preScanResult?.audioFiles ?? [])].sort((a, b) => {
        const aNum = a.trackNumber ?? Infinity;
        const bNum = b.trackNumber ?? Infinity;
        return aNum - bNum;
      }),
    [preScanResult?.audioFiles]
  );

  const albumMeta = preScanResult?.albumMeta ?? {};
  const hasAlbumMeta =
    albumMeta.title ||
    albumMeta.albumArtist ||
    albumMeta.year ||
    albumMeta.date ||
    albumMeta.label ||
    (albumMeta.genres?.length ?? 0) > 0;

  return (
    <Modal
      open={isOpen && preScanResult !== null}
      onClose={onClose}
      title={t("previewTitle")}
      size="small"
      focusTrapOptions={{ delayInitialFocus: true }}
    >
      {existingTracksCount > 0 && (
        <AlertBox type="warning">
          <AlertIcon>⚠️</AlertIcon>
          <AlertText>
            {t("existingTracksWarning", { count: existingTracksCount })}
          </AlertText>
        </AlertBox>
      )}

      {preScanResult && hasInvalidFiles && (
        <AlertBox type="error">
          <AlertIcon>
            <FaExclamationTriangle />
          </AlertIcon>
          <AlertText>
            {t("invalidFilesFound", {
              count: preScanResult.invalidFiles.length,
            })}
            <InvalidFilesList>
              {preScanResult.invalidFiles.map((f) => (
                <li key={f.name}>
                  {f.name} — {f.reason}
                </li>
              ))}
            </InvalidFilesList>
            <div
              className={css`
                margin-top: 0.75rem;
              `}
            >
              <label
                className={css`
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                `}
              >
                <input
                  type="radio"
                  name="invalidAction"
                  value="skip"
                  checked={invalidFilesAction === "skip"}
                  onChange={() => onInvalidFilesActionChange("skip")}
                />
                {t("skipInvalidFiles")}
              </label>
              <label
                className={css`
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  margin-top: 0.5rem;
                `}
              >
                <input
                  type="radio"
                  name="invalidAction"
                  value="cancel"
                  checked={invalidFilesAction === "cancel"}
                  onChange={() => onInvalidFilesActionChange("cancel")}
                />
                {t("cancelImport")}
              </label>
            </div>
          </AlertText>
        </AlertBox>
      )}

      {hasAlbumMeta && (
        <Section>
          <SectionTitle>{t("albumDetails")}</SectionTitle>
          <MetaGrid>
            {albumMeta.title && (
              <>
                <dt>{t("albumTitle")}</dt>
                <dd>{albumMeta.title}</dd>
              </>
            )}
            {albumMeta.albumArtist && (
              <>
                <dt>{t("albumArtist")}</dt>
                <dd>{albumMeta.albumArtist}</dd>
              </>
            )}
            {(albumMeta.date || albumMeta.year) && (
              <>
                <dt>{t("releaseDate")}</dt>
                <dd>{albumMeta.date ?? String(albumMeta.year)}</dd>
              </>
            )}
            {albumMeta.label && (
              <>
                <dt>{t("label")}</dt>
                <dd>{albumMeta.label}</dd>
              </>
            )}
            {albumMeta.genres && albumMeta.genres.length > 0 && (
              <>
                <dt>{t("genre")}</dt>
                <dd>{albumMeta.genres.join(", ")}</dd>
              </>
            )}
          </MetaGrid>
        </Section>
      )}

      {preScanResult && preScanResult.audioFiles.length > 0 && (
        <Section>
          <SectionTitle>
            <SuccessIcon>
              <FaCheckCircle /> {preScanResult.audioFiles.length}
            </SuccessIcon>
            {t("tracksFound")}
          </SectionTitle>
          <AudioFilesList>
            {sortedAudioFiles.map((af, idx) => (
              <AudioFileItem key={`${af.file.name}-${idx}`}>
                <div>
                  {af.trackNumber && (
                    <TrackNumber>{af.trackNumber}.</TrackNumber>
                  )}
                  <FileName>{af.title}</FileName>
                </div>
                {af.artists.length > 0 && (
                  <ArtistName>{af.artists.join(", ")}</ArtistName>
                )}
              </AudioFileItem>
            ))}
          </AudioFilesList>
        </Section>
      )}

      {preScanResult && preScanResult.imageFiles.length > 0 && (
        <Section>
          <SectionTitle>{t("selectCoverImage")}</SectionTitle>
          <ImageGallery>
            {preScanResult.imageFiles.map((img, idx) => (
              <ImageOption
                key={`${img.name}-${idx}`}
                selected={idx === selectedCoverIndex}
              >
                <input
                  type="radio"
                  name="coverImage"
                  value={idx}
                  checked={idx === selectedCoverIndex}
                  onChange={() => onSelectedCoverChange(idx)}
                />
                {img.dataUrl && <img src={img.dataUrl} alt={img.name} />}
              </ImageOption>
            ))}
          </ImageGallery>
        </Section>
      )}

      {preScanResult && preScanResult.audioFiles.length === 0 && (
        <AlertBox type="error">
          <AlertIcon>
            <FaExclamationTriangle />
          </AlertIcon>
          <AlertText>{t("noAudioFilesFound")}</AlertText>
        </AlertBox>
      )}

      <ButtonGroup>
        <ArtistButton onClick={onClose} variant="outlined">
          {t("cancel")}
        </ArtistButton>
        <ArtistButton onClick={onConfirm} disabled={!canConfirm}>
          {t("confirmImport")}
        </ArtistButton>
      </ButtonGroup>
    </Modal>
  );
};
