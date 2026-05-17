import { useQuery } from "@tanstack/react-query";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ArtistFilter from "components/common/ArtistFilter";
import SectionActionStrip from "components/common/SectionActionStrip";
import Tooltip from "components/common/Tooltip";
import {
  queryArtist,
  queryManagedArtistTrackGroups,
  useDeleteTrackGroupMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { useParams } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";

import ManageArtistAlbumRow, {
  albumCellDivider,
  albumRowSubgrid,
  albumTableGrid,
  albumTableGridWithArtist,
} from "./ManageArtistAlbumRow";
import { ManageSectionWrapper } from "./ManageSectionWrapper";
import { NewAlbumButton } from "./NewAlbumButton";
import SetEntireCataloguePrice from "./SetEntireCataloguePrice";

const ManageArtistAlbumsTable: React.FC<{
  releases: TrackGroup[];
  showArtist?: boolean;
}> = ({ releases, showArtist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "artistAlbumsTable",
  });
  const snackbar = useSnackbar();

  const { mutateAsync: deleteTrackGroup, isPending: isDeletePending } =
    useDeleteTrackGroupMutation();

  const handleDelete = React.useCallback(
    async (trackGroupId: number) => {
      const confirmed = window.confirm(t("deleteTrackGroupConfirm") ?? "");
      if (!confirmed) return;

      try {
        await deleteTrackGroup({ trackGroupId });
        snackbar(t("albumDeleted"), { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar(t("somethingWentWrong"), { type: "warning" });
      }
    },
    [t]
  );

  return (
    <div
      className={`flex flex-col gap-3 md:gap-0 text-xs md:divide-y-1 md:divide-(--mi-tint-color) md:border md:border-(--mi-tint-x-color) ${
        showArtist ? albumTableGridWithArtist : albumTableGrid
      }`}
    >
      <div className={`hidden md:block ${albumRowSubgrid}`}>
        <div className="truncate">{t("title")}</div>
        {showArtist && (
          <div className={`text-center truncate ${albumCellDivider}`}>
            {t("artist")}
          </div>
        )}
        <div className={`text-center truncate ${albumCellDivider}`}>
          {t("publishedAt")}
        </div>
        <div className={`text-center truncate ${albumCellDivider}`}>
          {t("releaseDate")}
        </div>
        <div className={`text-center truncate ${albumCellDivider}`}>
          {t("tracks")}
        </div>
        <div className={`text-center truncate ${albumCellDivider}`}>
          {t("catalogNumber")}
        </div>
        <div className={`text-center truncate ${albumCellDivider}`}>
          {t("price")}
        </div>
        <div className={`text-center truncate ${albumCellDivider}`}>
          {t("visibility")}
        </div>
        <div className={`text-center truncate ${albumCellDivider}`}>
          <Tooltip hoverText={t("managingPaymentsTooltip")}>
            {t("managingPayments")}
          </Tooltip>
        </div>
        <div aria-label="actions" className={albumCellDivider} />
      </div>

      {releases.map((release) => (
        <ManageArtistAlbumRow
          key={release.id}
          release={release}
          isDeletePending={isDeletePending}
          onDelete={handleDelete}
          showArtist={showArtist}
        />
      ))}
    </div>
  );
};

const ReleasesSection: React.FC<{
  title: string;
  description?: string;
  releases: TrackGroup[];
  showArtist?: boolean;
  filter?: React.ReactNode;
}> = ({ title, description, releases, showArtist, filter }) => {
  if (releases.length === 0 && !filter) return null;
  return (
    <div className="flex gap-2 flex-col">
      <h3>{title}</h3>
      {description && (
        <p className="text-sm text-(--mi-secondary-text-color) mb-1">
          {description}
        </p>
      )}
      {filter}
      <ManageArtistAlbumsTable releases={releases} showArtist={showArtist} />
    </div>
  );
};

const ManageArtistAlbums: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId } = useParams();
  const { data: artist, isLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: trackGroups, isLoading: isLoadingTrackGroups } = useQuery(
    queryManagedArtistTrackGroups({ artistId: Number(artistId) })
  );

  const { data: labelTrackGroups } = useQuery(
    queryManagedArtistTrackGroups({
      artistId: artist?.isLabelProfile ? Number(artistId) : undefined,
      includeLabelReleases: true,
    })
  );

  const isPublished = (album: TrackGroup) =>
    !!album.publishedAt && new Date(album.publishedAt) < new Date();

  const publishedReleases = trackGroups?.results.filter(isPublished) ?? [];
  const unpublishedReleases =
    trackGroups?.results.filter((a) => !isPublished(a)) ?? [];

  const labelReleases =
    labelTrackGroups?.results.filter(
      (a) => a.artist?.id !== Number(artistId)
    ) ?? [];

  const [unpublishedLabelArtistFilter, setUnpublishedLabelArtistFilter] =
    React.useState<number | null>(null);
  const [publishedLabelArtistFilter, setPublishedLabelArtistFilter] =
    React.useState<number | null>(null);

  const labelArtists = React.useMemo(() => {
    const map = new Map<number, Artist>();
    for (const r of labelReleases) {
      if (r.artist && !map.has(r.artist.id)) {
        map.set(r.artist.id, r.artist);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [labelReleases]);

  const matchesArtistFilter = (r: TrackGroup, filter: number | null) =>
    filter == null || r.artist?.id === filter;

  const publishedLabelReleases = labelReleases.filter(
    (r) => isPublished(r) && matchesArtistFilter(r, publishedLabelArtistFilter)
  );
  const unpublishedLabelReleases = labelReleases.filter(
    (r) =>
      !isPublished(r) && matchesArtistFilter(r, unpublishedLabelArtistFilter)
  );

  return (
    <ManageSectionWrapper>
      <SectionActionStrip>
        <SetEntireCataloguePrice />
        <ArtistButtonLink
          to={`/manage/artists/${artistId}/releases/tools`}
          size="compact"
          startIcon={<MdOutlineDownloadForOffline />}
          variant="dashed"
          collapsible
        >
          {t("downloadCodes")}
        </ArtistButtonLink>
        {artist ? <NewAlbumButton artist={artist} /> : undefined}
      </SectionActionStrip>
      {trackGroups?.results.length === 0 && !isLoadingTrackGroups && (
        <div>{t("noAlbumsYet")}</div>
      )}

      <div className="flex flex-col gap-6 px-2">
        {isLoading && <LoadingBlocks />}
        <ReleasesSection
          title={t(
            artist?.isLabelProfile
              ? "unpublishedLabelOwnReleases"
              : "unpublishedReleases"
          )}
          releases={unpublishedReleases}
        />
        <ReleasesSection
          title={t(
            artist?.isLabelProfile
              ? "publishedLabelOwnReleases"
              : "publishedReleases"
          )}
          releases={publishedReleases}
        />
        {artist?.isLabelProfile && (
          <>
            <ReleasesSection
              title={t("unpublishedLabelReleases")}
              description={t("labelReleasesDescription")}
              releases={unpublishedLabelReleases}
              showArtist
              filter={
                labelArtists.length > 0 ? (
                  <ArtistFilter
                    artists={labelArtists}
                    selectedArtistId={unpublishedLabelArtistFilter}
                    onChange={setUnpublishedLabelArtistFilter}
                  />
                ) : undefined
              }
            />
            <ReleasesSection
              title={t("labelReleases")}
              description={t("labelReleasesDescription")}
              releases={publishedLabelReleases}
              showArtist
              filter={
                labelArtists.length > 0 ? (
                  <ArtistFilter
                    artists={labelArtists}
                    selectedArtistId={publishedLabelArtistFilter}
                    onChange={setPublishedLabelArtistFilter}
                  />
                ) : undefined
              }
            />
          </>
        )}
      </div>
    </ManageSectionWrapper>
  );
};

export default ManageArtistAlbums;
