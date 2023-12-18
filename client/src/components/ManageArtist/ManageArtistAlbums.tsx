import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import TrackGroupCard from "./TrackGroupCard";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { FaPlus } from "react-icons/fa";
import HeaderDiv from "components/common/HeaderDiv";
import ManageSectionWrapper from "./ManageSectionWrapper";

const ManageArtistAlbums: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const {
    state: { artist },
  } = useArtistContext();

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
    <ManageSectionWrapper>
      <HeaderDiv>
        <h2>{t("yourAlbums")}</h2>

        <Link to="new-release">
          <Button compact transparent startIcon={<FaPlus />}>
            {t("addNewAlbum")}
          </Button>
        </Link>
      </HeaderDiv>
      {isLoading && <LoadingBlocks />}
      {trackGroups.length > 0 && (
        <div
          className={css`
            padding-bottom: 1rem;
          `}
        >
          {artist &&
            trackGroups?.map((album) => (
              <TrackGroupCard
                artist={artist}
                album={album}
                key={album.id}
                reload={fetchTrackGroups}
              />
            ))}
        </div>
      )}
    </ManageSectionWrapper>
  );
};

export default ManageArtistAlbums;
