import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { canUserEditArtist } from "utils/artist";

const FileChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 3px 8px 3px 3px;
  border: 1px dashed var(--mi-tint-x-color);
  border-radius: var(--mi-border-radius);
  background: transparent;
  color: var(--mi-text-color);
  font: inherit;
  line-height: 1.4;
`;

const FileChipButton = styled(FileChip.withComponent("button"))`
  border-style: solid;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--mi-button-color);
  }
`;

const FILE_EXTENSION_REGEX = /^[a-z0-9]{1,5}$/i;

const FileExtension = styled.span`
  padding: 1px 5px;
  border-radius: var(--mi-border-radius);
  background: var(--mi-tint-x-color);
  color: var(--mi-light-foreground-color);
  font-size: 0.85em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const splitFilename = (filename: string) => {
  const dotIndex = filename.lastIndexOf(".");
  const extension = filename.slice(dotIndex + 1);
  if (dotIndex <= 0 || !FILE_EXTENSION_REGEX.test(extension)) {
    return { name: filename, extension: undefined };
  }
  return { name: filename.slice(0, dotIndex), extension };
};

const FileLabel: React.FC<{ filename: string }> = ({ filename }) => {
  const { name, extension } = splitFilename(filename);
  return (
    <>
      {extension && <FileExtension>{extension}</FileExtension>}
      <span className="truncate">{name}</span>
    </>
  );
};

const ReleaseDownloadableContent: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
}> = ({ trackGroup, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });
  const { t: tDetails } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const { user } = useAuthContext();

  const userIsOwner = canUserEditArtist(user, artist);

  const userHasPurchasedTrackGroup = user?.userTrackGroupPurchases?.some(
    (m) => m.trackGroupId === trackGroup.id
  );

  const download = async (contentId: string, filename: string) => {
    const resp = await api.request(
      `downloadableContent/${contentId}`,
      {
        method: "GET",
        credentials: "include",
      },
      {
        noProcess: true,
      }
    );

    (resp as any).blob().then((blob: Blob) => {
      const href = URL.createObjectURL(blob);

      const anchorElement = document.createElement("a");
      anchorElement.href = href;
      anchorElement.download = filename;

      document.body.appendChild(anchorElement);
      anchorElement.click();

      document.body.removeChild(anchorElement);
      window.URL.revokeObjectURL(href);
    });
  };

  if (!trackGroup.downloadableContent?.length) {
    return null;
  }

  const canDownload = userHasPurchasedTrackGroup || userIsOwner;

  return (
    <div className="flex flex-col gap-2">
      <p>
        {t(
          canDownload
            ? "yourPurchaseIncludes"
            : "purchaseIncludesThisDownloadableContent"
        )}
      </p>
      <ul className="flex flex-wrap gap-1.5 list-none m-0 p-0">
        {trackGroup.downloadableContent.map((content) => {
          const filename = content.downloadableContent.originalFilename;
          return (
            <li key={content.downloadableContentId} className="min-w-0">
              {canDownload ? (
                <FileChipButton
                  type="button"
                  title={filename}
                  aria-label={tDetails("downloadFile", { filename })}
                  onClick={() =>
                    download(content.downloadableContentId, filename)
                  }
                >
                  <FileLabel filename={filename} />
                  <span
                    aria-hidden
                    className="font-bold text-(--mi-button-color)"
                  >
                    ↓
                  </span>
                </FileChipButton>
              ) : (
                <FileChip title={filename}>
                  <FileLabel filename={filename} />
                </FileChip>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ReleaseDownloadableContent;
