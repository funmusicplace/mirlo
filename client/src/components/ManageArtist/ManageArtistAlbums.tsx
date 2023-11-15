import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import TrackGroupCard from "./TrackGroupCard";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { useArtistContext } from "state/ArtistContext";
import LoadingBlocks from "components/Artist/LoadingBlocks";

const ManageArtistAlbums: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { artistId } = useParams();
  const {
    state: { isLoading },
  } = useArtistContext();

  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  const userId = user?.id;

  const fetchTrackGroups = React.useCallback(async () => {
    if (userId) {
      const fetchedTrackGroups = await api.getMany<TrackGroup>(
        `users/${userId}/trackGroups?artistId=${artistId}`
      );
      setTrackGroups(fetchedTrackGroups.results);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    fetchTrackGroups();
  }, [fetchTrackGroups]);

  return (
    <div
      className={css`
        padding: 0.5rem 0 2rem 0;
        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          padding: 1rem 0.5rem 0rem;
        }
      `}
    >
      <div
        className={css`
          display: flex;
          width: 100%;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        `}
      >
        <h2>{t("yourAlbums")}</h2>

        <Link to="new-release">
          <Button compact>{t("addNewAlbum")}</Button>
        </Link>
      </div>
      {isLoading && <LoadingBlocks />}
      {trackGroups.length > 0 && (
        <div
          className={css`
            padding-bottom: 1rem;
          `}
        >
          {trackGroups?.map((album) => (
            <TrackGroupCard
              album={album}
              key={album.id}
              reload={fetchTrackGroups}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageArtistAlbums;
