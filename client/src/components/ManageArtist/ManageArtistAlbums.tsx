import { css } from "@emotion/css";
import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoadingBlocks from "components/Artist/LoadingBlocks";

import { NewAlbumButton } from "./NewAlbumButton";
import { useQuery } from "@tanstack/react-query";
import {
  queryArtist,
  queryManagedArtistTrackGroups,
  queryPublicLabelTrackGroups,
  useDeleteTrackGroupMutation,
} from "queries";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import SetEntireCataloguePrice from "./SetEntireCataloguePrice";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import Table from "components/common/Table";
import { FaEye, FaTrash } from "react-icons/fa";
import { getManageReleaseUrl, getReleaseUrl } from "utils/artist";
import { useSnackbar } from "state/SnackbarContext";
import { useAuthContext } from "state/AuthContext";
import Tooltip from "components/common/Tooltip";

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
    <div className="flex flex-col gap-3 md:gap-0 text-xs md:divide-y-1 md:divide-(--mi-darken-background-color)">
      <div className="hidden md:grid md:grid-cols-10 md:items-center md:gap-3 md:px-3 md:py-1">
        <div className="col-span-2">{t("title")}</div>
        <div className="text-right">{t("publishedAt")}</div>
        <div className="text-right">{t("releaseDate")}</div>
        <div className="text-right">{t("tracks")}</div>
        <div className="text-right">{t("catalogNumber")}</div>
        <div className="text-right">
          <Tooltip hoverText={t("managingPaymentsTooltip")}>
            {t("managingPayments")}
          </Tooltip>
        </div>
        <div aria-label="actions" className="col-span-3" />
      </div>

      {releases.map((release) => {
        const isPublished =
          release.publishedAt && new Date(release.publishedAt) < new Date();

        return (
          <div
            key={release.id}
            className="flex flex-col gap-3 rounded-md md:px-3 md:py-1 md:grid md:grid-cols-10 md:items-center md:gap-3"
          >
            <div className="flex items-center gap-3 col-span-2">
              {release.cover && (
                <img
                  src={release.cover.sizes?.[120] ?? release.cover.url?.[0]}
                  alt={release.title}
                  className="h-10 w-10 flex-shrink-0 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{release.title}</div>
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
              <div className="text-right" aria-labelledby="catalogNumber">
                {release.catalogNumber}
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

            <div className="flex flex-wrap justify-end gap-2 md:col-span-3">
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
function deleteTrackGroup(arg0: { userId: any; trackGroupId: number }) {
  throw new Error("Function not implemented.");
}
