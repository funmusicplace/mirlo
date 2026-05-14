import { css } from "@emotion/css";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp, FaEye, FaTrash } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { getManageReleaseUrl, getReleaseUrl } from "utils/artist";

import { bp } from "../../constants";

const sharedTableGridRules = `
  > *:nth-child(odd) {
    background-color: var(--mi-button-tint-color);
  }

  > *:first-child {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
`;

export const albumTableGrid = css`
  @media (min-width: ${bp.medium}px) {
    display: grid;
    grid-template-columns:
      minmax(8rem, 1fr) minmax(0, max-content) minmax(0, max-content)
      minmax(0, max-content) minmax(0, max-content) minmax(0, max-content)
      minmax(0, max-content) minmax(0, max-content) max-content;
    ${sharedTableGridRules}
  }
`;

export const albumTableGridWithArtist = css`
  @media (min-width: ${bp.medium}px) {
    display: grid;
    grid-template-columns:
      minmax(8rem, 1fr) minmax(0, max-content) minmax(0, max-content)
      minmax(0, max-content) minmax(0, max-content) minmax(0, max-content)
      minmax(0, max-content) minmax(0, max-content) minmax(0, max-content)
      max-content;
    ${sharedTableGridRules}
  }
`;

export const albumRowSubgrid = css`
  @media (min-width: ${bp.medium}px) {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: center;
    gap: 0.75rem;
    padding: 0.25rem 0.75rem;
  }
`;

export const albumCellDivider = css`
  @media (min-width: ${bp.medium}px) {
    border-left: 1px solid var(--mi-tint-color);
    padding-left: 0.75rem;
  }
`;

const MetadataCell: React.FC<{
  labelKey: string;
  releaseId: number;
  title?: string;
  forceTruncate?: boolean;
  children: React.ReactNode;
}> = ({ labelKey, releaseId, title, forceTruncate, children }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "artistAlbumsTable",
  });
  const labelId = `${labelKey}-${releaseId}`;
  return (
    <>
      <div id={labelId} className="md:hidden">
        {t(labelKey)}
      </div>
      <div
        className={`text-right md:text-center ${forceTruncate ? "truncate" : "md:truncate"} ${albumCellDivider}`}
        aria-labelledby={labelId}
        title={title}
      >
        {children}
      </div>
    </>
  );
};

type ManageArtistAlbumRowProps = {
  release: TrackGroup;
  isDeletePending: boolean;
  onDelete: (trackGroupId: number) => void;
  showArtist?: boolean;
};

const ManageArtistAlbumRow: React.FC<ManageArtistAlbumRowProps> = ({
  release,
  isDeletePending,
  onDelete,
  showArtist,
}) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "artistAlbumsTable",
  });
  const [isExpanded, setIsExpanded] = React.useState(false);

  const isPublished =
    !!release.publishedAt && new Date(release.publishedAt) < new Date();
  const metadataId = `release-metadata-${release.id}`;

  return (
    <div
      className={`flex flex-col gap-3 max-md:rounded-md max-md:bg-(--mi-button-tint-color) max-md:p-3 ${albumRowSubgrid}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {release.cover ? (
          <img
            src={release.cover.sizes?.[120] ?? release.cover.url?.[0]}
            alt={release.title}
            className="h-10 w-10 flex-shrink-0 object-cover"
          />
        ) : (
          <div
            className="h-10 w-10 flex-shrink-0 border border-(--mi-tint-x-color)"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1">
          <div
            className="font-medium truncate"
            title={release.title || t("untitledRelease")}
          >
            {release.title || (
              <span className="italic">{t("untitledRelease")}</span>
            )}
          </div>
          {showArtist && release.artist?.name && (
            <div
              className="text-xs truncate md:hidden text-(--mi-secondary-text-color)"
              title={release.artist.name}
            >
              {release.artist.name}
            </div>
          )}
        </div>
        <div className="md:hidden">
          <Button
            type="button"
            variant="transparent"
            size="compact"
            onlyIcon
            startIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            aria-expanded={isExpanded}
            aria-controls={metadataId}
            aria-label={isExpanded ? t("collapseDetails") : t("expandDetails")}
            onClick={() => setIsExpanded((v) => !v)}
          />
        </div>
      </div>

      {showArtist && (
        <div
          className={`hidden md:block text-center md:truncate ${albumCellDivider}`}
          title={release.artist?.name}
        >
          <span className="sr-only">{t("artist")}: </span>
          {release.artist?.name ?? "×"}
        </div>
      )}

      <div
        id={metadataId}
        className={`grid grid-cols-2 gap-x-4 gap-y-2 md:contents ${
          isExpanded ? "" : "max-md:hidden"
        }`}
      >
        <MetadataCell labelKey="publishedAt" releaseId={release.id}>
          {release.publishedAt ? release.publishedAt.split("T")[0] : "×"}
        </MetadataCell>
        <MetadataCell labelKey="releaseDate" releaseId={release.id}>
          {release.releaseDate ? release.releaseDate.split("T")[0] : "×"}
        </MetadataCell>
        <MetadataCell labelKey="tracks" releaseId={release.id}>
          {release.tracks.length}
        </MetadataCell>
        <MetadataCell
          labelKey="catalogNumber"
          releaseId={release.id}
          title={release.catalogNumber}
          forceTruncate
        >
          {release.catalogNumber || "×"}
        </MetadataCell>
        <MetadataCell labelKey="price" releaseId={release.id}>
          {release.minPrice ? `${release.minPrice} ${release.currency}` : "×"}
        </MetadataCell>
        <MetadataCell labelKey="visibility" releaseId={release.id}>
          {!isPublished
            ? t("unpublished")
            : release.isPublic
              ? t("public")
              : t("private")}
        </MetadataCell>
        <MetadataCell labelKey="managingPayments" releaseId={release.id}>
          {release.paymentToUserId === user?.id ||
          release.artist?.userId === user?.id
            ? t("yes")
            : t("no")}
        </MetadataCell>
      </div>

      <div className={`flex flex-wrap justify-end gap-2 ${albumCellDivider}`}>
        <ArtistButtonLink
          to={getManageReleaseUrl(release.artist, release)}
          size="compact"
          variant="outlined"
        >
          {t("manageAlbum")}
        </ArtistButtonLink>
        {release.artist && isPublished && (
          <ArtistButtonLink
            to={getReleaseUrl(release.artist, release)}
            size="compact"
            variant="outlined"
            startIcon={<FaEye />}
            onlyIcon
          >
            {t("viewLive")}
          </ArtistButtonLink>
        )}
        {release.artist && !isPublished && (
          <ArtistButtonLink
            to={getReleaseUrl(release.artist, release)}
            size="compact"
            variant="dashed"
            startIcon={<FaEye />}
            onlyIcon
          >
            {t("preview")}
          </ArtistButtonLink>
        )}
        <ArtistButton
          size="compact"
          variant="outlined"
          startIcon={<FaTrash />}
          onClick={() => onDelete(release.id)}
          isLoading={isDeletePending}
          onlyIcon
        >
          {t("delete")}
        </ArtistButton>
      </div>
    </div>
  );
};

export default ManageArtistAlbumRow;
