import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Tooltip from "components/common/Tooltip";
import {
  queryArtist,
  queryManagedArtistTrackGroups,
  queryPublicLabelTrackGroups,
  useDeleteTrackGroupMutation,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEye, FaTrash } from "react-icons/fa";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getManageReleaseUrl, getReleaseUrl } from "utils/artist";

import { NewAlbumButton } from "./NewAlbumButton";
import SetEntireCataloguePrice from "./SetEntireCataloguePrice";

const ManageArtistAlbumsTable: React.FC<{ releases: TrackGroup[] }> = ({
  releases,
}) => {
  const { user } = useAuthContext();
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
    <div className="flex flex-col gap-3 md:gap-0 text-xs md:divide-y-1 md:divide-(--mi-tint-color)">
      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_40px_minmax(0,1fr)_minmax(0,1fr)_60px_minmax(0,4fr)] md:items-center md:gap-3 md:px-3 md:py-1">
        <div>{t("title")}</div>
        <div className="text-right">{t("publishedAt")}</div>
        <div className="text-right">{t("releaseDate")}</div>
        <div className="text-right">{t("tracks")}</div>
        <div className="text-right">{t("catalogNumber")}</div>
        <div className="text-right">{t("visibility")}</div>
        <div className="text-right">
          <Tooltip hoverText={t("managingPaymentsTooltip")}>
            {t("managingPayments")}
          </Tooltip>
        </div>
        <div aria-label="actions" />
      </div>

      {releases.map((release) => {
        const isPublished =
          release.publishedAt && new Date(release.publishedAt) < new Date();

        return (
          <div
            key={release.id}
            className="flex flex-col gap-3 rounded-md md:px-3 md:py-1 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_40px_minmax(0,1fr)_minmax(0,1fr)_60px_minmax(0,4fr)] md:items-center md:gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {release.cover && (
                <img
                  src={release.cover.sizes?.[120] ?? release.cover.url?.[0]}
                  alt={release.title}
                  className="h-10 w-10 flex-shrink-0 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate" title={release.title}>
                  {release.title}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:contents">
              <div id="publishedAt" className="md:hidden">
                {t("publishedAt")}
              </div>
              <div className="text-right" aria-labelledby="publishedAt">
                {release.publishedAt ? release.publishedAt.split("T")[0] : "×"}
              </div>

              <div id="releaseDate" className="md:hidden">
                {t("releaseDate")}
              </div>
              <div
                className="text-right lg:text-right"
                aria-labelledby="releaseDate"
              >
                {release.releaseDate ? release.releaseDate.split("T")[0] : "×"}
              </div>

              <div id="tracks" className="md:hidden">
                {t("tracks")}
              </div>
              <div className="text-right" aria-labelledby="tracks">
                {release.tracks.length}
              </div>

              <div id="catalogNumber" className="md:hidden">
                {t("catalogNumber")}
              </div>
              <div
                className="text-right truncate"
                aria-labelledby="catalogNumber"
                title={release.catalogNumber}
              >
                {release.catalogNumber}
              </div>

              <div id="visibility" className="md:hidden">
                {t("visibility")}
              </div>
              <div className="text-right" aria-labelledby="visibility">
                {isPublished && !release.isPublic ? t("private") : ""}
              </div>

              <div id="managingPayments" className="md:hidden">
                {t("managingPayments")}
              </div>
              <div className="text-right" aria-labelledby="managingPayments">
                {release.paymentToUserId === user?.id ||
                release.artist?.userId === user?.id
                  ? "Yes"
                  : "No"}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
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
                >
                  {t("preview")}
                </ArtistButtonLink>
              )}
              <ArtistButton
                size="compact"
                variant="outlined"
                startIcon={<FaTrash />}
                onClick={() => handleDelete(release.id)}
                isLoading={isDeletePending}
              >
                {t("delete")}
              </ArtistButton>
            </div>
          </div>
        );
      })}
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

  const { data: publishedLabelReleases } = useQuery(
    queryPublicLabelTrackGroups(artistId, { excludeArtistId: Number(artistId) })
  );

  const publishedReleases =
    trackGroups?.results.filter(
      (album) => album.publishedAt && new Date(album.publishedAt) < new Date()
    ) ?? [];

  const unpublishedReleases =
    trackGroups?.results.filter(
      (album) =>
        !(album.publishedAt && new Date(album.publishedAt) < new Date())
    ) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between w-full gap-2">
        {trackGroups?.results.length === 0 && !isLoadingTrackGroups && (
          <div>{t("noAlbumsYet")}</div>
        )}
        {trackGroups?.results.length !== 0 && <div />}
        <div
          className={css`
            display: flex;
            flex-wrap: wrap;
            gap: 0.2rem;
          `}
        >
          <SetEntireCataloguePrice />
          <ArtistButtonLink
            to={`/manage/artists/${artistId}/releases/tools`}
            size="compact"
            startIcon={<MdOutlineDownloadForOffline />}
            variant="outlined"
            collapsible
            className={css`
              margin-right: 0.25rem;
              margin-left: 0.25rem;
            `}
          >
            {t("downloadCodes")}
          </ArtistButtonLink>
          {artist ? <NewAlbumButton artist={artist} /> : undefined}
        </div>
      </div>

      <div className="flex flex-col gap-10 px-2">
        {isLoading && <LoadingBlocks />}
        {(unpublishedReleases.length ?? 0) > 0 && (
          <div>
            <h3>{t("unpublishedReleases")}</h3>
            <ManageArtistAlbumsTable releases={unpublishedReleases} />
          </div>
        )}
        {(publishedReleases.length ?? 0) > 0 && (
          <div>
            <h3>{t("publishedReleases")}</h3>
            <ManageArtistAlbumsTable releases={publishedReleases} />
          </div>
        )}

        {artist?.isLabelProfile &&
          publishedLabelReleases?.results &&
          (publishedLabelReleases.results.length ?? 0) > 0 && (
            <div className="flex gap-2 flex-col">
              <h3>{t("labelReleases")}</h3>
              <p>{t("labelReleasesDescription")}</p>
              <ManageArtistAlbumsTable
                releases={publishedLabelReleases.results}
              />
            </div>
          )}
      </div>
    </div>
  );
};

export default ManageArtistAlbums;
