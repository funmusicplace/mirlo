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
    <Table className="text-xs">
      <thead>
        <tr>
          <th aria-label="cover"></th>
          <th className="w-1/6">{t("title")}</th>
          <th className="text-right!">{t("publishedAt")}</th>
          <th className="text-right!">{t("releaseDate")}</th>
          <th className="text-right!">{t("tracks")}</th>
          <th className="text-right!">{t("catalogNumber")}</th>
          <th className="text-right!">
            <Tooltip hoverText={t("managingPaymentsTooltip")}>
              {t("managingPayments")}
            </Tooltip>
          </th>
          <th aria-label="actions"></th>
        </tr>
      </thead>
      <tbody>
        {releases.map((release) => {
          const isPublished =
            release.publishedAt && new Date(release.publishedAt) < new Date();
          return (
            <tr className="text-xs">
              <td>
                {release.cover && (
                  <img
                    src={release.cover.sizes?.[120] ?? release.cover.url?.[0]}
                    alt={release.title}
                    className="w-10 h-10 object-cover flex-shrink-0"
                  />
                )}
              </td>
              <td>{release.title}</td>
              <td className="text-right">
                {release.publishedAt ? release.publishedAt.split("T")[0] : "×"}
              </td>
              <td className="text-right">
                {release.releaseDate ? release.releaseDate.split("T")[0] : "×"}
              </td>
              <td className="text-right">{release.tracks.length}</td>
              <td className="text-right">{release.catalogNumber}</td>
              <td className="text-right!">
                {release.paymentToUserId === user?.id ||
                release.artist?.userId === user?.id
                  ? "Yes"
                  : "No"}
              </td>
              <td aria-label="actions" className="flex gap-2 justify-end">
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
                  startIcon={<FaTrash />}
                  onClick={() => handleDelete(release.id)}
                  isLoading={isDeletePending}
                >
                  {t("delete")}
                </ArtistButton>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
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

      <div className="flex flex-col gap-10">
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
            <div>
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
