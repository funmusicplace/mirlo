import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ManageAlbumForm from "./ManageAlbumForm";
import NewAlbumForm from "./NewAlbumForm";
import TrackGroupCard from "./TrackGroupCard";
import { useTranslation } from "react-i18next";
import { MdAdd } from "react-icons/md";

const ManageArtistAlbums: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();
  const [manageTrackgroup, setManageTrackgroup] = React.useState<TrackGroup>();
  const [addingNewAlbum, setAddingNewAlbum] = React.useState(false);

  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  const userId = user?.id;

  const fetchTrackGroups = React.useCallback(async () => {
    if (userId) {
      const { result } = await api.get<Artist>(
        `users/${userId}/artists/${artistId}`
      );
      setArtist(result);
      const fetchedTrackGroups = await api.getMany<TrackGroup>(
        `users/${userId}/trackGroups?artistId=${artistId}`
      );
      setTrackGroups(fetchedTrackGroups.results);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    fetchTrackGroups();
  }, [fetchTrackGroups]);

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        margin-top: 2rem;
        margin-bottom: 1.5rem;
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

        <Button
          onClick={() => {
            setAddingNewAlbum(true);
          }}
          startIcon={<MdAdd />}
          compact
        >
          {t("addNewAlbum", { artistName: artist.name })}
        </Button>
      </div>
      {trackGroups.length > 0 && (
        <div
          className={css`
            margin-bottom: 1rem;
          `}
        >
          {trackGroups?.map((album) => (
            <TrackGroupCard
              album={album}
              key={album.id}
              setManageTrackgroup={setManageTrackgroup}
            />
          ))}
        </div>
      )}
      {manageTrackgroup && (
        <ManageAlbumForm
          open={!!manageTrackgroup}
          trackgroup={manageTrackgroup}
          onClose={() => setManageTrackgroup(undefined)}
          reload={() => {
            return fetchTrackGroups();
          }}
          artist={artist}
        />
      )}

      <NewAlbumForm
        open={addingNewAlbum}
        onClose={() => setAddingNewAlbum(false)}
        reload={() => {
          return fetchTrackGroups();
        }}
        artist={artist}
      />
    </div>
  );
};

export default ManageArtistAlbums;
