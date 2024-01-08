import React from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";

const NewReleaseRedirect: React.FC<{}> = () => {
  const navigate = useNavigate();
  const {
    state: { user },
  } = useGlobalStateContext();

  const {
    state: { artist },
  } = useArtistContext();

  const userId = user?.id;

  React.useEffect(() => {
    const callback = async () => {
      if (artist) {
        const newAlbum = await api.post<
          Partial<TrackGroup>,
          { result: TrackGroup }
        >(`users/${userId}/trackGroups`, {
          title: "",
          urlSlug: `mi-temp-slug-new-album-${
            artist?.trackGroups.length ?? 0 + 2
          }`,
          artistId: artist.id,
        });
        navigate(`/manage/artists/${artist.id}/release/${newAlbum.result.id}`);
      }
    };
    callback();
  }, [artist, navigate, userId]);

  return <LoadingBlocks />;
};

export default NewReleaseRedirect;
