import { css } from "@emotion/css";
import { ButtonLink } from "components/common/Button";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";
import TrackGroupCard from "./TrackGroupCard";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { FaPlus, FaWrench } from "react-icons/fa";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "./ManageSectionWrapper";
import { useAuthContext } from "state/AuthContext";

const ManageArtistAlbums: React.FC<{}> = () => {
  const { user } = useAuthContext();
  const {
    state: { artist, isLoading },
  } = useArtistContext();

  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { artistId } = useParams();
  const [isLoadingTrackGroups, setIsLoading] = React.useState(true);
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  const userId = user?.id;

  const fetchTrackGroups = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (userId) {
        const fetchedTrackGroups = await api.getMany<TrackGroup>(
          `users/${userId}/trackGroups?artistId=${artistId}`
        );
        setTrackGroups(fetchedTrackGroups.results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    fetchTrackGroups();
  }, [fetchTrackGroups]);

  return (
    <ManageSectionWrapper>
      <SpaceBetweenDiv>
        {trackGroups.length === 0 && !isLoadingTrackGroups && (
          <div>{t("noAlbumsYet")}</div>
        )}
        {trackGroups.length !== 0 && <div />}
        <div>
          <ButtonLink
            to={`/manage/artists/${artistId}/releases/tools`}
            compact
            transparent
            startIcon={<FaWrench />}
            variant="outlined"
            collapsible
            className={css`
              margin-right: 0.25rem;
            `}
          >
            {t("tools")}
          </ButtonLink>
          <ButtonLink
            to={`/manage/artists/${artistId}/new-release`}
            compact
            transparent
            startIcon={<FaPlus />}
            variant="dashed"
            collapsible
          >
            {t("addNewAlbum")}
          </ButtonLink>
        </div>
      </SpaceBetweenDiv>
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
